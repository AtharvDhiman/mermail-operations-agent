import { SentinelStatus } from './types.js';
import { loadConfig } from './config.js';
import { MermailClient } from './mermail-client.js';
import {
  validateAddressForChain,
  findAllowlistedRelayer,
  sanitizeEmailContent,
  DailyBudgetTracker
} from './security.js';

export class MermailRelayerSentinel {
  constructor(options = {}) {
    this.config = loadConfig(options);
    this.client = options.client || new MermailClient(this.config);
    this.budgetTracker = new DailyBudgetTracker(this.config.dailyMaxUsdCap);
    this.status = SentinelStatus.IDLE;
    this.lastProcessedIncident = null;
  }

  /**
   * Parse relayer deficit parameters from alert email content.
   */
  parseAlertDetails(email) {
    const rawText = email.body?.text || '';
    const cleanText = sanitizeEmailContent(rawText);

    // Extraction patterns
    const addressMatch = cleanText.match(/Target Address:\s*([1-9A-HJ-NP-Za-km-z0-9xX]+)/i);
    const balanceMatch = cleanText.match(/Current Balance:\s*([0-9.]+)\s*([A-Za-z]+)/i);
    const relayerIdMatch = cleanText.match(/Relayer ID:\s*([a-zA-Z0-9_-]+)/i);
    const chainMatch = cleanText.match(/Network:\s*([a-zA-Z0-9_-]+)/i);

    return {
      emailId: email.id,
      sender: email.from,
      subject: email.subject,
      relayerId: relayerIdMatch ? relayerIdMatch[1].trim() : null,
      chain: chainMatch ? chainMatch[1].trim().toLowerCase() : 'solana',
      targetAddress: addressMatch ? addressMatch[1].trim() : null,
      currentBalance: balanceMatch ? parseFloat(balanceMatch[1]) : 0,
      token: balanceMatch ? balanceMatch[2].toUpperCase() : 'SOL',
      rawCleanText: cleanText
    };
  }

  /**
   * Main scan & triage loop
   */
  async scanForIncidents() {
    this.status = SentinelStatus.SCANNING;
    
    // 1. Discover mailboxes
    const mailboxRes = await this.client.callTool('list_mailboxes');
    const mailbox = mailboxRes.mailboxes?.[0];
    const mailboxId = mailbox?.public_id || this.config.mailboxId;

    // 2. Fetch unread alerts
    const emailRes = await this.client.callTool('list_emails', {
      mailboxId,
      query: {
        isRead: false,
        sortColumn: 'date',
        sortDirection: 'DESC',
        limit: 5
      }
    });

    const emails = emailRes.emails || [];
    const triageResults = [];

    for (const email of emails) {
      const incident = await this.triageAlert(email);
      triageResults.push(incident);
    }

    return triageResults;
  }

  /**
   * Triage an individual alert email against security invariants
   */
  async triageAlert(email) {
    this.status = SentinelStatus.ALERT_DETECTED;
    const parsed = this.parseAlertDetails(email);

    if (!parsed.targetAddress) {
      return {
        status: SentinelStatus.ERROR,
        reason: 'UNABLE_TO_PARSE_ADDRESS',
        alert: parsed
      };
    }

    // Step 2.1: Verify Address Syntax
    const isValidFormat = validateAddressForChain(parsed.chain, parsed.targetAddress);
    if (!isValidFormat) {
      return {
        status: SentinelStatus.REJECTED_SECURITY_VIOLATION,
        reason: 'INVALID_ADDRESS_FORMAT',
        alert: parsed
      };
    }

    // Step 2.2: Verify Allowlist Membership
    const relayer = findAllowlistedRelayer(this.config.relayers, parsed.targetAddress, parsed.chain);
    if (!relayer) {
      return {
        status: SentinelStatus.REJECTED_SECURITY_VIOLATION,
        reason: 'UNAUTHORIZED_TARGET_ADDRESS',
        alert: parsed
      };
    }

    this.status = SentinelStatus.ALLOWLIST_VERIFIED;

    // Step 2.3: Calculate Deficit
    const targetBalance = relayer.targetBalance;
    const currentBalance = parsed.currentBalance;
    const rawDeficit = Math.max(0, targetBalance - currentBalance);
    const bufferMultiplier = this.config.policy?.defaultGasBufferMultiplier || 1.25;
    let proposedTopUp = Number((rawDeficit * bufferMultiplier).toFixed(4));

    // Fallback minimum top up if balance is slightly below threshold
    if (proposedTopUp <= 0) {
      proposedTopUp = Number(relayer.minThreshold || 0.1);
    }

    // Rough USD estimate (e.g. 1 SOL = $150, 1 ETH = $2500)
    const tokenPriceUsd = parsed.token === 'SOL' ? 150 : (parsed.token === 'ETH' ? 2500 : 1);
    const proposedTopUpUsd = proposedTopUp * tokenPriceUsd;

    // Check single-transaction cap
    if (proposedTopUpUsd > this.config.maxSingleTopUpUsd) {
      return {
        status: SentinelStatus.REJECTED_OVER_CAP,
        reason: 'EXCEEDS_SINGLE_TOPUP_CAP',
        proposedTopUpUsd,
        capUsd: this.config.maxSingleTopUpUsd,
        alert: parsed
      };
    }

    // Check daily budget cap
    if (!this.budgetTracker.canAfford(proposedTopUpUsd)) {
      return {
        status: SentinelStatus.REJECTED_OVER_CAP,
        reason: 'EXCEEDS_DAILY_BUDGET_CAP',
        proposedTopUpUsd,
        remainingDailyBudgetUsd: this.budgetTracker.getRemainingBudget(),
        alert: parsed
      };
    }

    // Step 2.4: Probe PayBox Portfolio
    const conn = await this.client.callTool('get_paybox_connection');
    if (conn.status !== 'ACTIVE') {
      return {
        status: SentinelStatus.ERROR,
        reason: 'PAYBOX_NOT_ACTIVE',
        details: conn
      };
    }

    const portfolioRes = await this.client.callTool('paybox_get_portfolio');
    const chainBalances = portfolioRes.portfolio?.chains?.[parsed.chain] || {};
    const availableGas = chainBalances[parsed.token] || 0;

    let route = 'DIRECT_TRANSFER';
    if (availableGas < proposedTopUp) {
      if ((chainBalances.USDC || 0) >= proposedTopUpUsd) {
        route = 'SWAP_THEN_TRANSFER';
      } else {
        return {
          status: SentinelStatus.ERROR,
          reason: 'INSUFFICIENT_TREASURY_FUNDS',
          required: proposedTopUp,
          availableGas,
          availableUsdc: chainBalances.USDC || 0
        };
      }
    }

    this.status = SentinelStatus.AWAITING_OPERATOR_APPROVAL;

    const incident = {
      status: this.status,
      emailId: email.id,
      relayerId: relayer.id,
      relayerName: relayer.name,
      chain: parsed.chain,
      token: parsed.token,
      targetAddress: parsed.targetAddress,
      currentBalance,
      targetBalance,
      proposedTopUp,
      proposedTopUpUsd,
      availableTreasuryGas: availableGas,
      route,
      remainingDailyBudgetUsd: this.budgetTracker.getRemainingBudget(),
      preview: this.formatReplenishmentPreview({
        relayer,
        chain: parsed.chain,
        token: parsed.token,
        currentBalance,
        proposedTopUp,
        proposedTopUpUsd,
        availableGas,
        route,
        remainingBudget: this.budgetTracker.getRemainingBudget() - proposedTopUpUsd
      })
    };

    this.lastProcessedIncident = incident;
    return incident;
  }

  /**
   * Execute an authorized PayBox gas replenishment proposal
   */
  async executeReplenishment(incident) {
    if (!incident || !incident.targetAddress) {
      throw new Error('No valid incident provided for replenishment.');
    }

    this.status = SentinelStatus.SIGNING_PENDING;

    // 1. If swap required, execute swap first
    if (incident.route === 'SWAP_THEN_TRANSFER') {
      await this.client.callTool('paybox_request_swap', {
        chain: incident.chain,
        fromToken: 'USDC',
        toToken: incident.token,
        fromAmount: incident.proposedTopUpUsd.toString()
      });
    }

    // 2. Request transfer via PayBox
    const transferRes = await this.client.callTool('paybox_request_transfer', {
      chain: incident.chain,
      token: incident.token,
      amount: incident.proposedTopUp.toString(),
      destinationAddress: incident.targetAddress
    });

    const requestId = transferRes.requestId;
    const signingUrl = transferRes.signing_handoff?.console_url;

    // 3. Reconcile settlement
    const settlementRes = await this.client.callTool('paybox_get_request', { requestId });

    if (settlementRes.status === 'success') {
      this.status = SentinelStatus.SETTLED_ON_CHAIN;
      this.budgetTracker.recordDisbursement(incident.proposedTopUpUsd, {
        relayerId: incident.relayerId,
        txHash: settlementRes.txHash
      });

      // 4. Send operational receipt to the alerting thread
      await this.client.callTool('reply_to_email', {
        emailId: incident.emailId,
        body: {
          subject: `Re: [RESOLVED] Relayer Gas Refueled - ${incident.relayerId}`,
          text: `Relayer ${incident.relayerName} successfully replenished.\nAmount: ${incident.proposedTopUp} ${incident.token}\nTx: ${settlementRes.txHash}`
        }
      });

      // 5. Save audit draft
      await this.client.callTool('save_draft', {
        mailboxId: this.config.mailboxId,
        body: {
          subject: `[TREASURY AUDIT] Gas Top-Up: ${incident.relayerId}`,
          text: `Executed top-up of ${incident.proposedTopUp} ${incident.token} to ${incident.targetAddress}. TxHash: ${settlementRes.txHash}`
        }
      });

      // 6. Mark email read
      await this.client.callTool('update_email', {
        emailId: incident.emailId,
        body: { isRead: true }
      });

      return {
        status: SentinelStatus.SETTLED_ON_CHAIN,
        requestId,
        signingUrl,
        txHash: settlementRes.txHash,
        incident
      };
    }

    return {
      status: SentinelStatus.SIGNING_PENDING,
      requestId,
      signingUrl,
      incident
    };
  }

  formatReplenishmentPreview(data) {
    return [
      '═════════════════════════════════════════════════════════════════',
      'RELAYER GAS REPLENISHMENT PREVIEW (Awaiting Operator Approval)',
      '═════════════════════════════════════════════════════════════════',
      `Relayer ID:       ${data.relayer.id}`,
      `Relayer Name:     ${data.relayer.name}`,
      `Chain / Asset:    ${data.chain.toUpperCase()} (${data.token})`,
      `Target Address:   ${data.relayer.address}`,
      `Current Balance:  ${data.currentBalance} ${data.token} (Threshold: ${data.relayer.minThreshold} ${data.token})`,
      `Proposed Top-Up:  ${data.proposedTopUp} ${data.token} (~$${data.proposedTopUpUsd.toFixed(2)} USD)`,
      `Route / Source:   ${data.route} (Treasury Available: ${data.availableGas} ${data.token})`,
      `Daily Cap Status: $${(data.remainingBudget).toFixed(2)} USD remaining of $${this.config.dailyMaxUsdCap} cap`,
      '═════════════════════════════════════════════════════════════════'
    ].join('\n');
  }
}

export { MermailRelayerSentinel as SentinelAgent };
