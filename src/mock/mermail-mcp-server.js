import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

export class MockMermailMcpServer {
  constructor(initialData = {}) {
    this.mailboxes = initialData.mailboxes || [
      {
        id: 'mbx_ops_sentinel_01',
        public_id: 'mbx_ops_sentinel_01',
        email: 'ops@dapp.mermail.app',
        name: 'DevOps & Relayer Operations Mailbox',
        disabled_at: null,
        settings: { agentInbox: true }
      }
    ];

    // Load fixture emails if not supplied
    if (initialData.emails) {
      this.emails = JSON.parse(JSON.stringify(initialData.emails));
    } else {
      const fixturePath = path.join(rootDir, 'tests', 'fixtures', 'alerts.json');
      try {
        this.emails = JSON.parse(readFileSync(fixturePath, 'utf8'));
      } catch {
        this.emails = [];
      }
    }

    this.drafts = [];
    this.sentReplies = [];
    this.requests = new Map();

    // PayBox treasury balances
    this.portfolio = initialData.portfolio || {
      walletAddress: 'TreasurySo1anaWa11etPayBoxEnclave999999999999',
      chains: {
        solana: {
          SOL: 5.42,
          USDC: 2500.00
        },
        base: {
          ETH: 1.25,
          USDC: 1200.00
        }
      }
    };

    this.payboxConnected = initialData.payboxConnected ?? true;
    this.activeSigner = 'owner_signer_alex';
  }

  async callTool(name, args = {}) {
    switch (name) {
      case 'list_mailboxes':
        return { mailboxes: this.mailboxes };

      case 'list_emails': {
        const query = args.query || {};
        let filtered = [...this.emails];
        if (query.isRead !== undefined) {
          filtered = filtered.filter((e) => e.isRead === query.isRead);
        }
        if (query.sortColumn === 'date' && query.sortDirection === 'DESC') {
          filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        if (query.limit) {
          filtered = filtered.slice(0, query.limit);
        }
        return { emails: filtered, total: filtered.length };
      }

      case 'get_email': {
        const email = this.emails.find((e) => e.id === args.emailId);
        if (!email) throw new Error(`Email not found: ${args.emailId}`);
        return {
          email,
          agent_safe_content: email.body?.text || ''
        };
      }

      case 'get_email_context': {
        const email = this.emails.find((e) => e.id === args.emailId);
        return {
          threadId: args.emailId,
          messages: email ? [email] : []
        };
      }

      case 'update_email': {
        const email = this.emails.find((e) => e.id === args.emailId);
        if (!email) throw new Error(`Email not found: ${args.emailId}`);
        if (args.body && args.body.isRead !== undefined) {
          email.isRead = args.body.isRead;
        }
        return { success: true, email };
      }

      case 'save_draft': {
        const draftId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const draft = {
          id: draftId,
          mailboxId: args.mailboxId,
          subject: args.body?.subject,
          to: args.body?.to,
          text: args.body?.text,
          createdAt: new Date().toISOString()
        };
        this.drafts.push(draft);
        return { draft_id: draftId, status: 'saved' };
      }

      case 'reply_to_email': {
        const replyId = `reply_sent_${Date.now()}`;
        this.sentReplies.push({
          id: replyId,
          emailId: args.emailId,
          body: args.body,
          timestamp: new Date().toISOString()
        });
        return {
          id: replyId,
          delivered: true,
          status: 'sent'
        };
      }

      case 'get_paybox_connection': {
        if (!this.payboxConnected) {
          return { status: 'DISCONNECTED', connect_handoff: { console_url: 'https://console.mermail.app/paybox/connect' } };
        }
        return {
          status: 'ACTIVE',
          connectionId: 'pbc_solana_treasury_01',
          delegatedRole: 'operator',
          ownerAddress: 'OwnerSo1anaAdminWa11etKey999999999999999999'
        };
      }

      case 'paybox_get_portfolio': {
        return {
          status: 'success',
          portfolio: this.portfolio
        };
      }

      case 'paybox_request_swap': {
        const reqId = `req_swap_${Date.now()}`;
        const { chain, fromToken, toToken, fromAmount } = args;
        // Mock swap rate: 1 SOL = 150 USDC
        const rate = (fromToken === 'USDC' && toToken === 'SOL') ? (1 / 150) : 150;
        const expectedOutput = (Number(fromAmount) * rate).toFixed(4);

        const swapRecord = {
          requestId: reqId,
          type: 'swap',
          chain,
          fromToken,
          toToken,
          fromAmount,
          expectedOutput,
          status: 'pending_signature',
          signing_handoff: {
            console_url: `https://console.mermail.app/paybox/sign?req=${reqId}`
          }
        };
        this.requests.set(reqId, swapRecord);
        return swapRecord;
      }

      case 'paybox_request_transfer': {
        const reqId = `req_tx_${Date.now()}`;
        const { chain, token, amount, destinationAddress } = args;
        const transferRecord = {
          requestId: reqId,
          type: 'transfer',
          chain,
          token,
          amount: Number(amount),
          destinationAddress,
          status: 'pending_signature',
          signing_handoff: {
            console_url: `https://console.mermail.app/paybox/sign?req=${reqId}`
          }
        };
        this.requests.set(reqId, transferRecord);
        return transferRecord;
      }

      case 'paybox_get_request': {
        const req = this.requests.get(args.requestId);
        if (!req) throw new Error(`PayBox request not found: ${args.requestId}`);
        
        // Auto-resolve to success if queried in test / simulation
        if (req.status === 'pending_signature') {
          req.status = 'success';
          req.txHash = req.chain === 'solana' 
            ? '5KtPn7qWJb4y9gZ8tX1mP4vL6kQ2sR3yE5wU8aN0pM' 
            : '0x3a4f89d9e2b1c7a45612389fedcba09876543210abcdef0123456789abcdef01';
          
          // Deduct from portfolio
          if (this.portfolio.chains[req.chain] && this.portfolio.chains[req.chain][req.token]) {
            this.portfolio.chains[req.chain][req.token] = Math.max(
              0,
              this.portfolio.chains[req.chain][req.token] - req.amount
            );
          }
        }
        return req;
      }

      case 'prepare_destructive_action': {
        return {
          token: `mcp_token_${Date.now()}`,
          expiresInSeconds: 300
        };
      }

      default:
        throw new Error(`Unknown mock tool: ${name}`);
    }
  }
}
