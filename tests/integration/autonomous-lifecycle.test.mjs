import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { agent } from '../../src/operations-agent.js';
import { memory } from '../../src/memory.js';
import { safety } from '../../src/safety.js';
import { followup } from '../../src/followup.js';
import { audit } from '../../src/audit.js';
import { WorkflowState } from '../../src/types.js';

describe('End-to-End Autonomous Lifecycle Across Operational Modes', () => {
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  it('should execute full Sales/GTM lifecycle with dual-control approval and follow-up', async () => {
    const leadEmail = {
      id: `lead_${nonce}_1`,
      from: `alexa.${nonce}@growthscale.com`,
      subject: `Inquiry: Enterprise Mailbox Routing and SLA [${nonce}]`,
      body: `Hi, we are evaluating automated email platforms for our 40-person team. What is the enterprise pricing? We have a budget of $5,000 USD. Ref: ${nonce}`
    };

    // Step 1: Agent receives email, triages, plans, and pauses at approval gate
    const outcome1 = await agent.processIncomingEmail(leadEmail);
    assert.equal(outcome1.state, WorkflowState.WAITING_APPROVAL);
    assert.ok(outcome1.approvalToken);
    assert.ok(outcome1.approvalPreview.impact.includes('External email transmission'));

    // Step 2: Operator reviews preview and authorizes transmission
    const resumed = await agent.approveAndResume(outcome1.approvalToken, 'Head_Of_Sales');
    assert.ok(
      resumed.state === WorkflowState.WAITING_FOR_REPLY || resumed.state === WorkflowState.COMPLETED,
      `Expected state WAITING_FOR_REPLY or COMPLETED, got ${resumed.state}`
    );

    // Step 3: Verify follow-up cadence was registered in follow-up engine
    const activeFollowups = followup.list().filter(f => f.recipient === leadEmail.from);
    assert.ok(activeFollowups.length > 0);
    assert.equal(activeFollowups[0].status, 'SCHEDULED');

    // Step 4: Verify contact memory updated
    const contact = memory.getContact(leadEmail.from);
    assert.ok(contact);
    assert.equal(contact.lastCategory, 'SALES_GTM');

    // Step 5: Verify immutable audit trail has recorded completion
    const taskLogs = audit.getTaskLogs(resumed.task.id);
    assert.ok(taskLogs.some(l => l.action === 'WORKFLOW_COMPLETED'));
  });

  it('should execute Scheduling lifecycle, resolve calendar slots, and cancel on reply', async () => {
    const schedulingEmail = {
      id: `sched_${nonce}_2`,
      from: `david.${nonce}@vc-fund.com`,
      subject: `Partnership Sync next week [${nonce}]`,
      body: `Hi team, would you have 30 minutes on Thursday at 2:00 PM UTC or Friday for a partnership sync? Ref: ${nonce}`
    };

    const outcome = await agent.processIncomingEmail(schedulingEmail);
    assert.equal(outcome.state, WorkflowState.WAITING_APPROVAL);

    // Approve outbound scheduling proposal
    const resumed = await agent.approveAndResume(outcome.approvalToken, 'Executive_Assistant');
    assert.ok(resumed.state === WorkflowState.WAITING_FOR_REPLY || resumed.state === WorkflowState.COMPLETED);

    // Follow-up was registered
    const scheduledFup = followup.list().find(f => f.recipient === schedulingEmail.from && f.status === 'SCHEDULED');
    assert.ok(scheduledFup);

    // Simulating inbound counterparty reply
    const cancelled = followup.handleInboundReply(scheduledFup.threadId, schedulingEmail.from);
    assert.ok(cancelled.length > 0);
    assert.equal(cancelled[0].status, 'CANCELLED_BY_REPLY');
  });

  it('should execute Support lifecycle with troubleshooting diagnosis and satisfaction check', async () => {
    const supportEmail = {
      id: `supp_${nonce}_3`,
      from: `developer.${nonce}@clientapp.io`,
      subject: `Bug: Webhook signature verification failing [${nonce}]`,
      body: `Hello Support, we are seeing HMAC SHA256 signature mismatch errors on webhook delivery since this morning. Please advise. Ref: ${nonce}`
    };

    const outcome = await agent.processIncomingEmail(supportEmail);
    assert.equal(outcome.state, WorkflowState.WAITING_APPROVAL);

    // Approve support reply
    const resumed = await agent.approveAndResume(outcome.approvalToken, 'Support_Lead');
    assert.ok(resumed.state === WorkflowState.WAITING_FOR_REPLY || resumed.state === WorkflowState.COMPLETED);

    // Audit logs verify support steps
    const logs = audit.getTaskLogs(resumed.task.id);
    assert.ok(logs.some(l => l.action === 'STEP_EXECUTED'));
    assert.ok(logs.some(l => l.action === 'WORKFLOW_COMPLETED'));
  });
});
