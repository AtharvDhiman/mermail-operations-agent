import test from 'node:test';
import assert from 'node:assert/strict';
import { EscrowDesk, ESCROW_STATES } from '../../src/escrow-desk.js';
import path from 'path';
import fs from 'fs';

const TEST_STORAGE = path.resolve(process.cwd(), 'data', 'test-escrow-inbox.json');

test('Escrow Desk & Inbox-as-a-Database Unit Tests', async (t) => {
  // Clean up any test artifact
  if (fs.existsSync(TEST_STORAGE)) {
    try { fs.unlinkSync(TEST_STORAGE); } catch {}
  }

  const desk = new EscrowDesk(TEST_STORAGE);

  await t.test('should initialize default seeded escrow deals', () => {
    const deals = desk.listDeals();
    assert.ok(deals.length >= 2, 'Should seed at least 2 demo deals');
    assert.ok(desk.getDeal('ESC-2026-001'), 'Should have ESC-2026-001');
    assert.ok(desk.getDeal('ESC-2026-002'), 'Should have ESC-2026-002');
  });

  await t.test('should create a new escrow contract and log thread email', () => {
    const deal = desk.createDeal({
      buyer: 'buyer-agent@mermail.app',
      provider: 'scraper-agent@mermail.app',
      amount: '75.00',
      asset: 'USDC',
      title: 'Solana Token Holder Snapshot',
      terms: 'JSON file of top 1000 holders'
    });

    assert.ok(deal.dealId.startsWith('ESC-'), 'Deal ID should start with ESC-');
    assert.equal(deal.state, ESCROW_STATES.INITIALIZED);
    assert.equal(deal.amount, '75.00');

    // Verify Inbox-as-a-Database thread
    const thread = desk.getThreadEmails(deal.dealId);
    assert.ok(thread.length >= 1, 'Should have initialized root thread in inbox');
    assert.ok(thread[0].subject.includes(deal.dealId));
  });

  await t.test('should transition to FUNDED upon PayBox custody lock', () => {
    const deal = desk.createDeal({
      buyer: 'payer@mermail.app',
      provider: 'dev@mermail.app',
      amount: '40.00'
    });

    const funded = desk.fundDeal(deal.dealId);
    assert.equal(funded.state, ESCROW_STATES.FUNDED);
    assert.ok(funded.deposit.txHash, 'Deposit transaction hash must be recorded');

    const thread = desk.getThreadEmails(deal.dealId);
    assert.ok(thread.some(e => e.status === ESCROW_STATES.FUNDED));
  });

  await t.test('should record deliverable and compute SHA-256 checksum', () => {
    const deal = desk.createDeal({
      buyer: 'payer@mermail.app',
      provider: 'dev@mermail.app',
      amount: '60.00'
    });
    desk.fundDeal(deal.dealId);

    const content = JSON.stringify({ data: 'solana-cluster-snapshot-2026' });
    const delivered = desk.deliverDeal(deal.dealId, {
      filename: 'snapshot.json',
      content
    });

    assert.equal(delivered.state, ESCROW_STATES.DELIVERED);
    assert.ok(delivered.deliverable.hash, 'SHA-256 checksum must be computed');
    assert.equal(delivered.deliverable.filename, 'snapshot.json');
    assert.equal(delivered.deliverable.timeliness, 'ON_TIME');
  });

  await t.test('should execute mutual release and dispatch PayBox transfer', () => {
    const deal = desk.createDeal({
      buyer: 'payer@mermail.app',
      provider: 'dev@mermail.app',
      amount: '50.00'
    });
    desk.fundDeal(deal.dealId);
    desk.deliverDeal(deal.dealId, { filename: 'output.csv' });

    const settled = desk.releaseDeal(deal.dealId);
    assert.equal(settled.state, ESCROW_STATES.SETTLED_RELEASED);
    assert.equal(settled.settlement.amount, '50.00');
    assert.ok(settled.settlement.txHash.includes('Solana'));
  });

  await t.test('should handle dispute and execute AI Arbitration 4-factor scoring rubric', () => {
    const deal = desk.createDeal({
      buyer: 'payer-client@mermail.app',
      provider: 'coder-bot@mermail.app',
      amount: '100.00'
    });
    desk.fundDeal(deal.dealId);
    desk.deliverDeal(deal.dealId, { filename: 'contract.sol' });

    const disputed = desk.disputeDeal(deal.dealId, {
      reason: 'Missing reentrancy guard on line 42'
    });
    assert.equal(disputed.state, ESCROW_STATES.IN_ARBITRATION);

    // Arbitrate with custom 80-point split
    const arbitrated = desk.arbitrateDeal(deal.dealId, {
      timeliness: 25,
      specMatch: 25,
      functionalIntegrity: 15,
      revisions: 15
    });

    assert.equal(arbitrated.state, ESCROW_STATES.SETTLED_SPLIT);
    assert.equal(arbitrated.arbitration.score, 80);
    assert.equal(arbitrated.arbitration.payouts.length, 2);
    assert.equal(arbitrated.arbitration.payouts[0].amount, '70.00'); // 70% to provider
    assert.equal(arbitrated.arbitration.payouts[1].amount, '30.00'); // 30% to buyer
  });

  await t.test('should execute search_emails across Inbox-as-a-Database', () => {
    const results = desk.searchEmails('ESC-2026-001');
    assert.ok(results.length > 0, 'Should find email events for ESC-2026-001');
    for (const r of results) {
      assert.ok(r.threadId.includes('ESC-2026-001') || r.subject.includes('ESC-2026-001'));
    }
  });

  // Cleanup
  if (fs.existsSync(TEST_STORAGE)) {
    try { fs.unlinkSync(TEST_STORAGE); } catch {}
  }
});
