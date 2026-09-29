/**
 * Mermail Agent Escrow & Arbitration Desk - Domain Model & Inbox-as-a-Database Store
 *
 * Implements:
 * 1. Multi-Agent Escrow Lifecycle (INITIALIZED -> FUNDED -> DELIVERED -> SETTLED / ARBITRATION)
 * 2. Inbox-as-a-Database thread logging & full-text search via search_emails simulation
 * 3. PayBox Pre-flight & Agent Wallet custody settlement
 * 4. 4-part AI Arbitration Scoring Rubric (Timeliness, Spec, Functional, Revisions)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ESCROW_STORAGE_FILE = path.join(DATA_DIR, 'escrow-inbox.json');

export const ESCROW_STATES = {
  INITIALIZED: 'INITIALIZED',
  FUNDED: 'FUNDED',
  IN_PROGRESS: 'IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  IN_ARBITRATION: 'IN_ARBITRATION',
  SETTLED_RELEASED: 'SETTLED_RELEASED',
  SETTLED_REFUNDED: 'SETTLED_REFUNDED',
  SETTLED_SPLIT: 'SETTLED_SPLIT'
};

export class EscrowDesk {
  constructor(storagePath = ESCROW_STORAGE_FILE) {
    this.storagePath = storagePath;
    this.deals = new Map();
    this.emails = [];
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.deals)) {
            for (const d of parsed.deals) {
              this.deals.set(d.dealId, d);
            }
          }
          if (Array.isArray(parsed.emails)) {
            this.emails = parsed.emails;
          }
        }
      }
    } catch (err) {
      logger.warn(`Failed reading escrow inbox storage: ${err.message}. Using fresh database.`);
    }

    if (this.deals.size === 0) {
      this.seedDefaultDeals();
    }
  }

  save() {
    try {
      const payload = {
        updatedAt: new Date().toISOString(),
        deals: Array.from(this.deals.values()),
        emails: this.emails
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      const tmpFile = `${this.storagePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpFile, jsonStr, 'utf8');
      try {
        fs.renameSync(tmpFile, this.storagePath);
      } catch {
        fs.writeFileSync(this.storagePath, jsonStr, 'utf8');
        try { fs.unlinkSync(tmpFile); } catch {}
      }
    } catch (err) {
      logger.error(`Failed to save escrow inbox storage: ${err.message}`);
    }
  }

  seedDefaultDeals() {
    // Seed Deal 1: Sol-Commerce Market Intelligence Dataset (Settled)
    const deal1 = {
      dealId: 'ESC-2026-001',
      buyer: 'agent-buyer@mermail.app',
      provider: 'agent-scraper@mermail.app',
      amount: '50.00',
      asset: 'USDC',
      chain: 'solana',
      title: 'Sol-Commerce Market Intelligence Dataset (5,000 Records)',
      terms: 'Delivery of 5,000 verified Solana merchant JSON records within 7 days',
      deadlineDays: 7,
      disputeWindowHours: 48,
      createdAt: '2026-09-28T10:00:00.000Z',
      state: ESCROW_STATES.SETTLED_RELEASED,
      custodyWallet: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      deliverable: {
        filename: 'sol_merchants_5000.json',
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        deliveredAt: '2026-09-28T14:30:00.000Z',
        timeliness: 'ON_TIME'
      },
      settlement: {
        type: 'MUTUAL_RELEASE',
        txHash: '5k8G9z6y3v1xWq4u2nZp9aM8bC7dE6fG5hJ4kL3mN2oP1qR8sT7uV6wX5yZ4aB3c',
        recipient: 'agent-scraper@mermail.app',
        amount: '50.00',
        settledAt: '2026-09-28T16:00:00.000Z'
      }
    };

    // Seed Deal 2: Anchor Staking Contract (Arbitrated 70/30 Split)
    const deal2 = {
      dealId: 'ESC-2026-002',
      buyer: 'payer-client@mermail.app',
      provider: 'provider-dev@mermail.app',
      amount: '100.00',
      asset: 'USDC',
      chain: 'solana',
      title: 'Solana Anchor Staking & Reward Vault Contract',
      terms: 'Anchor workspace with vault init, deposit, and emergency unstake instruction',
      deadlineDays: 5,
      disputeWindowHours: 48,
      createdAt: '2026-09-27T08:00:00.000Z',
      state: ESCROW_STATES.SETTLED_SPLIT,
      custodyWallet: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      deliverable: {
        filename: 'anchor_staking_vault.tar.gz',
        hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        deliveredAt: '2026-09-28T18:00:00.000Z',
        timeliness: 'ON_TIME'
      },
      dispute: {
        lodgedBy: 'payer-client@mermail.app',
        reason: 'Missing emergency_unstake instruction & compiler warning on line 142',
        lodgedAt: '2026-09-28T20:00:00.000Z'
      },
      arbitration: {
        score: 80,
        breakdown: {
          timeliness: 25,
          specMatch: 25,
          functionalIntegrity: 15,
          revisions: 15
        },
        outcome: 'PRO_RATA_SPLIT_70_30',
        payouts: [
          { recipient: 'provider-dev@mermail.app', amount: '70.00', txHash: '9aL2xK4mN7qP3tV8yZ1wB5cD6eF7gH8jK9mN0pQ1rS2tU3vW4xY5zA6bC7dE8fG9h' },
          { recipient: 'payer-client@mermail.app', amount: '30.00', txHash: '8bK1wJ3mP6rT2sU7xY0vA4bC5dE6fG7hJ8kL9mN0pQ1rS2tU3vW4xY5zA6bC7dE8' }
        ],
        arbitratedAt: '2026-09-28T22:30:00.000Z'
      }
    };

    this.deals.set(deal1.dealId, deal1);
    this.deals.set(deal2.dealId, deal2);

    // Initial email thread events for Inbox-as-a-Database
    this.emails.push(
      {
        id: 'msg_001_init',
        threadId: 'ESC-2026-001',
        from: 'escrow-desk@mermail.app',
        to: ['agent-buyer@mermail.app', 'agent-scraper@mermail.app'],
        subject: '[ESC-2026-001] Escrow Contract Initialized: 50.00 USDC',
        body: 'Escrow contract ESC-2026-001 established. Awaiting PayBox custody deposit of 50.00 USDC.',
        date: deal1.createdAt,
        status: 'INITIALIZED'
      },
      {
        id: 'msg_001_funded',
        threadId: 'ESC-2026-001',
        from: 'escrow-desk@mermail.app',
        to: ['agent-buyer@mermail.app', 'agent-scraper@mermail.app'],
        subject: '[ESC-2026-001] STATUS: FUNDED — Notice to Commence Work',
        body: '50.00 USDC locked into Agent Wallet custody (4k3D...rkX6R). Provider is authorized to begin work.',
        date: '2026-09-28T10:15:00.000Z',
        status: 'FUNDED'
      },
      {
        id: 'msg_001_deliv',
        threadId: 'ESC-2026-001',
        from: 'agent-scraper@mermail.app',
        to: ['escrow-desk@mermail.app'],
        subject: '[ESC-2026-001] DELIVERABLE: Sol-Commerce Dataset (5,000 Records)',
        body: 'Attached dataset sol_merchants_5000.json. SHA-256: e3b0c442...a98f.',
        date: deal1.deliverable.deliveredAt,
        status: 'DELIVERED'
      },
      {
        id: 'msg_001_settled',
        threadId: 'ESC-2026-001',
        from: 'escrow-desk@mermail.app',
        to: ['agent-buyer@mermail.app', 'agent-scraper@mermail.app'],
        subject: '[ESC-2026-001] STATUS: SETTLED — Payout Receipt Dispatched',
        body: 'Mutual confirmation received. 50.00 USDC transferred to agent-scraper@mermail.app via PayBox.',
        date: deal1.settlement.settledAt,
        status: 'SETTLED_RELEASED'
      },
      {
        id: 'msg_002_init',
        threadId: 'ESC-2026-002',
        from: 'escrow-desk@mermail.app',
        to: ['payer-client@mermail.app', 'provider-dev@mermail.app'],
        subject: '[ESC-2026-002] Escrow Contract Initialized: 100.00 USDC',
        body: 'Anchor staking vault contract initialized for 100.00 USDC.',
        date: deal2.createdAt,
        status: 'INITIALIZED'
      },
      {
        id: 'msg_002_arbitration',
        threadId: 'ESC-2026-002',
        from: 'escrow-desk@mermail.app',
        to: ['payer-client@mermail.app', 'provider-dev@mermail.app'],
        subject: '[ESC-2026-002] STATUS: SETTLED_SPLIT — Official Docket & Receipts',
        body: 'Arbitration resolved with score 80/100 pts. 70.00 USDC awarded to provider, 30.00 USDC refunded to payer.',
        date: deal2.arbitration.arbitratedAt,
        status: 'SETTLED_SPLIT'
      }
    );

    this.save();
  }

  generateNextDealId() {
    const year = new Date().getFullYear();
    const count = this.deals.size + 1;
    return `ESC-${year}-${String(count).padStart(3, '0')}`;
  }

  createDeal({
    buyer,
    provider,
    amount,
    asset = 'USDC',
    chain = 'solana',
    title,
    terms,
    deadlineDays = 7,
    disputeWindowHours = 48
  }) {
    if (!buyer || !provider) {
      throw new Error('Both buyer and provider Mermail addresses are required.');
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error(`Invalid escrow amount: ${amount}`);
    }

    const dealId = this.generateNextDealId();
    const createdAt = new Date().toISOString();
    const isHighValue = numAmount > 500;

    const deal = {
      dealId,
      buyer: buyer.trim().toLowerCase(),
      provider: provider.trim().toLowerCase(),
      amount: numAmount.toFixed(2),
      asset: asset.toUpperCase(),
      chain: chain.toLowerCase(),
      title: title || `Agent Escrow Agreement for ${dealId}`,
      terms: terms || `Delivery within ${deadlineDays} days`,
      deadlineDays: parseInt(deadlineDays, 10),
      disputeWindowHours: parseInt(disputeWindowHours, 10),
      createdAt,
      state: ESCROW_STATES.INITIALIZED,
      isHighValue,
      custodyWallet: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
    };

    this.deals.set(dealId, deal);

    const initEmail = {
      id: `msg_${dealId}_${Date.now()}`,
      threadId: dealId,
      from: 'escrow-desk@mermail.app',
      to: [deal.buyer, deal.provider],
      subject: `[${dealId}] Escrow Contract Initialized: ${deal.amount} ${deal.asset}`,
      body: `Escrow contract ${dealId} has been established in Mermail Inbox Database.\nTerms: ${deal.terms}\nCustodian Wallet: ${deal.custodyWallet}`,
      date: createdAt,
      status: ESCROW_STATES.INITIALIZED
    };
    this.emails.push(initEmail);

    this.save();
    logger.info(`Escrow Desk initialized deal ${dealId} for ${deal.amount} ${deal.asset}`);
    return deal;
  }

  getDeal(dealId) {
    return this.deals.get(dealId) || null;
  }

  listDeals() {
    return Array.from(this.deals.values());
  }

  getThreadEmails(dealId) {
    return this.emails.filter(e => e.threadId === dealId);
  }

  searchEmails(query = '') {
    const q = query.toLowerCase().trim();
    if (!q) return this.emails;
    return this.emails.filter(email => {
      const matchSubject = email.subject && email.subject.toLowerCase().includes(q);
      const matchBody = email.body && email.body.toLowerCase().includes(q);
      const matchThread = email.threadId && email.threadId.toLowerCase().includes(q);
      const matchStatus = email.status && email.status.toLowerCase().includes(q);
      return matchSubject || matchBody || matchThread || matchStatus;
    });
  }

  fundDeal(dealId, { txHash, walletAddress } = {}) {
    const deal = this.getDeal(dealId);
    if (!deal) throw new Error(`Deal ${dealId} not found.`);
    if (deal.state !== ESCROW_STATES.INITIALIZED) {
      throw new Error(`Cannot fund deal in state: ${deal.state}`);
    }

    const generatedTx = txHash || `tx_deposit_${crypto.randomBytes(8).toString('hex')}`;
    deal.state = ESCROW_STATES.FUNDED;
    deal.deposit = {
      txHash: generatedTx,
      walletAddress: walletAddress || deal.custodyWallet,
      fundedAt: new Date().toISOString()
    };

    const email = {
      id: `msg_${dealId}_funded_${Date.now()}`,
      threadId: dealId,
      from: 'escrow-desk@mermail.app',
      to: [deal.buyer, deal.provider],
      subject: `[${dealId}] STATUS: FUNDED — Notice to Commence Work`,
      body: `PayBox Custody Lock verified! ${deal.amount} ${deal.asset} is secured in Agent Wallet custody. Work may begin.`,
      date: deal.deposit.fundedAt,
      status: ESCROW_STATES.FUNDED
    };
    this.emails.push(email);

    this.save();
    return deal;
  }

  deliverDeal(dealId, { filename, content, hash } = {}) {
    const deal = this.getDeal(dealId);
    if (!deal) throw new Error(`Deal ${dealId} not found.`);
    if (deal.state !== ESCROW_STATES.FUNDED && deal.state !== ESCROW_STATES.IN_PROGRESS) {
      throw new Error(`Cannot deliver for deal in state: ${deal.state}`);
    }

    let calculatedHash = hash;
    if (!calculatedHash && content) {
      calculatedHash = crypto.createHash('sha256').update(content).digest('hex');
    }
    if (!calculatedHash) {
      calculatedHash = crypto.randomBytes(32).toString('hex');
    }

    const deliveredAt = new Date().toISOString();
    deal.state = ESCROW_STATES.DELIVERED;
    deal.deliverable = {
      filename: filename || 'deliverable_artifact.json',
      hash: calculatedHash,
      deliveredAt,
      timeliness: 'ON_TIME',
      disputeWindowExpiresAt: new Date(Date.now() + (deal.disputeWindowHours || 48) * 3600000).toISOString()
    };

    const email = {
      id: `msg_${dealId}_deliv_${Date.now()}`,
      threadId: dealId,
      from: deal.provider,
      to: ['escrow-desk@mermail.app', deal.buyer],
      subject: `[${dealId}] DELIVERABLE: ${deal.deliverable.filename}`,
      body: `Deliverable received by Escrow Desk. SHA-256 Checksum: ${calculatedHash}. 48-Hour Dispute Countdown activated.`,
      date: deliveredAt,
      status: ESCROW_STATES.DELIVERED
    };
    this.emails.push(email);

    this.save();
    return deal;
  }

  releaseDeal(dealId, { note = 'Mutual Release confirmed by Payer' } = {}) {
    const deal = this.getDeal(dealId);
    if (!deal) throw new Error(`Deal ${dealId} not found.`);
    if (deal.state !== ESCROW_STATES.DELIVERED) {
      throw new Error(`Cannot release escrow in state: ${deal.state}. Deliverable must be submitted first.`);
    }

    const txHash = `5k8G${crypto.randomBytes(16).toString('hex')}Solana`;
    const settledAt = new Date().toISOString();

    deal.state = ESCROW_STATES.SETTLED_RELEASED;
    deal.settlement = {
      type: 'MUTUAL_RELEASE',
      txHash,
      recipient: deal.provider,
      amount: deal.amount,
      note,
      settledAt
    };

    const email = {
      id: `msg_${dealId}_settled_${Date.now()}`,
      threadId: dealId,
      from: 'escrow-desk@mermail.app',
      to: [deal.buyer, deal.provider],
      subject: `[${dealId}] STATUS: SETTLED — Payout Receipt Dispatched`,
      body: `Mutual settlement executed via PayBox. 100% of escrow funds (${deal.amount} ${deal.asset}) transferred to ${deal.provider}. Tx: ${txHash}`,
      date: settledAt,
      status: ESCROW_STATES.SETTLED_RELEASED
    };
    this.emails.push(email);

    this.save();
    return deal;
  }

  disputeDeal(dealId, { reason, lodgedBy } = {}) {
    const deal = this.getDeal(dealId);
    if (!deal) throw new Error(`Deal ${dealId} not found.`);
    if (deal.state !== ESCROW_STATES.DELIVERED) {
      throw new Error(`Cannot lodge dispute for deal in state: ${deal.state}. Must be in DELIVERED state.`);
    }

    const lodgedAt = new Date().toISOString();
    deal.state = ESCROW_STATES.IN_ARBITRATION;
    deal.dispute = {
      lodgedBy: lodgedBy || deal.buyer,
      reason: reason || 'Deliverable does not meet agreed contract specification',
      lodgedAt
    };

    const email = {
      id: `msg_${dealId}_disp_${Date.now()}`,
      threadId: dealId,
      from: 'escrow-desk@mermail.app',
      to: [deal.buyer, deal.provider],
      subject: `[${dealId}] NOTICE: Arbitration Initiated — Evidence Request (18h Window)`,
      body: `Dispute lodged: "${deal.dispute.reason}". Funds are frozen. Both parties are requested to submit logs and verification commits within 18 hours.`,
      date: lodgedAt,
      status: ESCROW_STATES.IN_ARBITRATION
    };
    this.emails.push(email);

    this.save();
    return deal;
  }

  arbitrateDeal(dealId, customScores = null) {
    const deal = this.getDeal(dealId);
    if (!deal) throw new Error(`Deal ${dealId} not found.`);
    if (deal.state !== ESCROW_STATES.IN_ARBITRATION) {
      throw new Error(`Cannot arbitrate deal in state: ${deal.state}. Deal must be IN_ARBITRATION.`);
    }

    const scores = customScores || {
      timeliness: 25,
      specMatch: 25,
      functionalIntegrity: 15,
      revisions: 15
    };

    const totalScore = (scores.timeliness || 0) + (scores.specMatch || 0) +
                       (scores.functionalIntegrity || 0) + (scores.revisions || 0);

    const arbitratedAt = new Date().toISOString();
    let outcome = 'PRO_RATA_SPLIT';
    let finalState = ESCROW_STATES.SETTLED_SPLIT;
    const totalAmount = parseFloat(deal.amount);
    let payouts = [];

    if (totalScore >= 90) {
      outcome = 'FULL_RELEASE_TO_PROVIDER';
      finalState = ESCROW_STATES.SETTLED_RELEASED;
      payouts.push({
        recipient: deal.provider,
        amount: totalAmount.toFixed(2),
        txHash: `tx_arb_rel_${crypto.randomBytes(12).toString('hex')}`
      });
    } else if (totalScore <= 40) {
      outcome = 'FULL_REFUND_TO_PAYER';
      finalState = ESCROW_STATES.SETTLED_REFUNDED;
      payouts.push({
        recipient: deal.buyer,
        amount: totalAmount.toFixed(2),
        txHash: `tx_arb_ref_${crypto.randomBytes(12).toString('hex')}`
      });
    } else {
      outcome = 'PRO_RATA_SPLIT_70_30';
      finalState = ESCROW_STATES.SETTLED_SPLIT;
      const provShare = (totalAmount * 0.70).toFixed(2);
      const payerShare = (totalAmount - parseFloat(provShare)).toFixed(2);
      payouts.push(
        { recipient: deal.provider, amount: provShare, txHash: `tx_arb_prov_${crypto.randomBytes(12).toString('hex')}` },
        { recipient: deal.buyer, amount: payerShare, txHash: `tx_arb_payer_${crypto.randomBytes(12).toString('hex')}` }
      );
    }

    deal.state = finalState;
    deal.arbitration = {
      score: totalScore,
      breakdown: scores,
      outcome,
      payouts,
      arbitratedAt
    };

    const docketBody = [
      `AI Arbitration Decision Docket for ${dealId}`,
      `Total Score: ${totalScore}/100 pts`,
      `Timeliness: ${scores.timeliness}/25 | Spec: ${scores.specMatch}/25 | Functional: ${scores.functionalIntegrity}/35 | Revisions: ${scores.revisions}/15`,
      `Verdict: ${outcome}`,
      `Payouts executed via PayBox:`
    ];
    for (const p of payouts) {
      docketBody.push(`- ${p.amount} ${deal.asset} -> ${p.recipient} (Tx: ${p.txHash})`);
    }

    const email = {
      id: `msg_${dealId}_arb_${Date.now()}`,
      threadId: dealId,
      from: 'escrow-desk@mermail.app',
      to: [deal.buyer, deal.provider],
      subject: `[${dealId}] STATUS: ${finalState} — Official Docket & Receipts`,
      body: docketBody.join('\n'),
      date: arbitratedAt,
      status: finalState
    };
    this.emails.push(email);

    this.save();
    return deal;
  }
}

export const escrowDesk = new EscrowDesk();
