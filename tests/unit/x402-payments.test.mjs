import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { agent } from '../../src/operations-agent.js';
import { InboxTriage } from '../../src/triage.js';
import { TaskPlanner } from '../../src/planner.js';
import { safety } from '../../src/safety.js';
import { ActionRiskLevel, ApprovalStatus, WorkflowState } from '../../src/types.js';

describe('HTTP 402 PayBox Settlement & Financial Safety Unit Tests', () => {
  const paywallEmail = {
    id: 'em_402_test',
    from: 'billing@data-feed.network',
    subject: 'HTTP 402: Lightning / PayBox Settlement Required for Data Feed',
    body: 'Payment Required: Endpoint requires 0.05 SOL payment to relayer 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R for invoice INV-402-9988.'
  };

  it('should detect 402 payment requirements and extract wallet & amount', () => {
    const task = InboxTriage.triageEmail(paywallEmail);
    assert.equal(task.category, 'GENERAL_OPS');
    assert.ok(task.entities.solanaAddress);
    assert.equal(task.entities.solanaAddress, '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R');
  });

  it('should plan financial transfers with mandatory human dual-control gates', () => {
    const task = InboxTriage.triageEmail(paywallEmail);
    const plan = TaskPlanner.planTask(task);

    const transferStep = plan.steps.find(s => s.tool === 'paybox_request_transfer');
    assert.ok(transferStep, 'Must include paybox_request_transfer step');
    assert.equal(transferStep.riskLevel, ActionRiskLevel.HIGH_RISK);
    assert.equal(transferStep.requiresApproval, true);
    assert.ok(transferStep.riskReason.toLowerCase().includes('financial') || transferStep.riskReason.toLowerCase().includes('transfer'));
  });

  it('should pause workflow at approval gate and resume upon operator authorization', async () => {
    const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const email = {
      id: `em_402_exec_${nonce}`,
      from: `treasury-${nonce}@validator.network`,
      subject: `CRITICAL: Solana Relayer low balance alert [${nonce}]`,
      body: `Relayer 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R balance low (0.04 SOL). Top up 1.5 SOL required immediately. Ref: ${nonce}`
    };

    // Run workflow up to first approval gate (PayBox financial transfer)
    const pausedOutcome = await agent.processIncomingEmail(email);
    assert.equal(pausedOutcome.state, WorkflowState.WAITING_APPROVAL);
    assert.ok(pausedOutcome.approvalToken);
    assert.ok(pausedOutcome.approvalToken.startsWith('APPR-'));
    assert.ok(pausedOutcome.approvalPreview);

    // Operator grants dual-control approval for transfer
    const resumeOutcome = await agent.approveAndResume(pausedOutcome.approvalToken, 'Operator_Treasurer');

    // May pause at second gate (external email transmission) or complete
    if (resumeOutcome.state === WorkflowState.WAITING_APPROVAL) {
      assert.ok(resumeOutcome.approvalToken);
      // Approve outbound email transmission
      const finalOutcome = await agent.approveAndResume(resumeOutcome.approvalToken, 'Operator_Comms');
      assert.ok(
        finalOutcome.state === WorkflowState.COMPLETED || finalOutcome.state === WorkflowState.WAITING_FOR_REPLY,
        `Expected completed, got ${finalOutcome.state}`
      );
    } else {
      assert.ok(
        resumeOutcome.state === WorkflowState.COMPLETED || resumeOutcome.state === WorkflowState.WAITING_FOR_REPLY
      );
    }
  });
});
