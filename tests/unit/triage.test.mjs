import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InboxTriage } from '../../src/triage.js';
import { AgentMode, PriorityLevel, UrgencyLevel } from '../../src/types.js';

describe('Intelligent Inbox Triage Unit Tests', () => {
  it('should categorize scheduling requests and extract meeting times', () => {
    const email = {
      id: 'email_sched_test',
      from: 'partner@example.com',
      subject: 'Can we reschedule our sync?',
      body: 'Could we move our meeting to Friday at 3:00 PM UTC? Let me know if that works.'
    };

    const task = InboxTriage.triageEmail(email);
    assert.equal(task.category, AgentMode.SCHEDULING);
    assert.equal(task.entities.timeSlot, '3:00 PM');
    assert.ok(task.confidence.percentage >= 80);
    assert.equal(task.requiredActions.scheduling_required, true);
    assert.equal(task.requiredActions.reply_required, true);
  });

  it('should categorize sales inquiries with enterprise pricing and ICP signals', () => {
    const email = {
      id: 'email_sales_test',
      from: 'buyer@enterprise-corp.com',
      subject: 'Enterprise Tier Pricing and API Quote',
      body: 'We want to deploy across our 50-person engineering team. Can you provide pricing details and schedule a demo?'
    };

    const task = InboxTriage.triageEmail(email);
    assert.equal(task.category, AgentMode.SALES_GTM);
    assert.ok(task.confidence.percentage >= 80);
    assert.equal(task.requiredActions.reply_required, true);
  });

  it('should triage customer support issues and set urgency levels', () => {
    const email = {
      id: 'email_support_test',
      from: 'user@client.net',
      subject: 'Bug: Webhook verification failed with 500 error',
      body: 'Our webhook listener is throwing 500 internal server error on incoming transfers.'
    };

    const task = InboxTriage.triageEmail(email);
    assert.equal(task.category, AgentMode.SUPPORT);
    assert.equal(task.priority, PriorityLevel.P3);
  });

  it('should triage critical infrastructure low-gas alerts as P0 General Ops', () => {
    const email = {
      id: 'email_ops_test',
      from: 'alerts@monitoring.io',
      subject: 'CRITICAL: Solana Relayer low balance alert',
      body: 'Relayer address: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R\nCurrent balance: 0.04 SOL\nImmediate replenishment required.'
    };

    const task = InboxTriage.triageEmail(email);
    assert.equal(task.category, AgentMode.GENERAL_OPS);
    assert.equal(task.priority, PriorityLevel.P0);
    assert.equal(task.urgency, UrgencyLevel.CRITICAL);
    assert.equal(task.requiredActions.immediate_action, true);
    assert.equal(task.requiredActions.approval_required, true);
    assert.equal(task.entities.solanaAddress, '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R');
  });
});
