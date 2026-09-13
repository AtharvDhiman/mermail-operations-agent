import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WorkflowEngine } from '../../src/workflow-engine.js';
import { WorkflowState, ApprovalStatus } from '../../src/types.js';
import { memory } from '../../src/memory.js';
import { safety } from '../../src/safety.js';
import { followup } from '../../src/followup.js';
import { agent as opsAgent } from '../../src/operations-agent.js';

describe('Workflow Failure Recovery & Post-Execution Verification Suite (Rule #17)', () => {
  let engine;

  beforeEach(() => {
    engine = new WorkflowEngine({ maxRetries: 2, baseBackoffMs: 10 });
    memory.clear();
    safety.clear();
    followup.clear();
  });

  // Scenario 1: Invalid State Machine Transitions
  describe('Scenario 1: Deterministic FSM State Validation', () => {
    it('should reject non-deterministic and skipped state transitions', () => {
      const task = {
        id: 'TASK-FSM-RECOVERY-01',
        state: WorkflowState.RECEIVED,
        stateHistory: []
      };

      // Illegal skip from RECEIVED directly to COMPLETED
      assert.throws(() => {
        engine.transitionState(task, WorkflowState.COMPLETED, 'Direct completion attempt');
      }, /Invalid state transition/i);

      // Transition to CLASSIFIED is valid
      engine.transitionState(task, WorkflowState.CLASSIFIED, 'Triaged');
      assert.equal(task.state, WorkflowState.CLASSIFIED);

      // Illegal back-transition to RECEIVED
      assert.throws(() => {
        engine.transitionState(task, WorkflowState.RECEIVED, 'Attempt backward rollback');
      }, /Invalid state transition/i);
    });

    it('should maintain immutable audit log of all valid state transitions', () => {
      const task = {
        id: 'TASK-FSM-AUDIT-01',
        state: WorkflowState.RECEIVED,
        stateHistory: []
      };

      engine.transitionState(task, WorkflowState.CLASSIFIED, 'Step 1: Classification');
      engine.transitionState(task, WorkflowState.PLANNED, 'Step 2: Planning');
      engine.transitionState(task, WorkflowState.EXECUTING, 'Step 3: Execution');

      assert.equal(task.stateHistory.length, 3);
      assert.equal(task.stateHistory[0].from, WorkflowState.RECEIVED);
      assert.equal(task.stateHistory[0].to, WorkflowState.CLASSIFIED);
      assert.equal(task.stateHistory[2].to, WorkflowState.EXECUTING);
      assert.ok(task.stateHistory[2].timestamp);
    });
  });

  // Scenario 2: Transient RPC Failures & Rate Limit Backoff
  describe('Scenario 2: Transient Error Resilience & Exponential Backoff', () => {
    it('should retry transient RPC failures (429, 503, timeout) and recover cleanly', async () => {
      let attempts = 0;
      const step = { id: 'step_rpc_retry', tool: 'paybox_get_portfolio', params: {} };
      const task = { id: 'TASK-TRANSIENT-01' };

      const flakyRpcExecutor = async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('HTTP 429: RPC node rate limit reached. Backoff required.');
        }
        return { status: 'SUCCESS', totalUsd: 15420.50 };
      };

      const result = await engine.executeWithRetry(step, flakyRpcExecutor, task);
      assert.equal(attempts, 3);
      assert.equal(result.status, 'SUCCESS');
      assert.equal(result.totalUsd, 15420.50);
    });

    it('should classify timeout and reset errors as TRANSIENT', () => {
      const errTimeout = new Error('Gateway Timeout 504 on RPC endpoint');
      assert.equal(engine.classifyError(errTimeout), 'TRANSIENT');
      assert.equal(engine.isTransientError(errTimeout), true);

      const errConn = new Error('read ECONNRESET from socket');
      assert.equal(engine.classifyError(errConn), 'TRANSIENT');
    });
  });

  // Scenario 3: Fatal Error Immediate Abort & Escalation
  describe('Scenario 3: Fatal Error Immediate Abort & Escalation', () => {
    it('should immediately fail and escalate on fatal authentication/security errors without retrying', async () => {
      let attempts = 0;
      const step = { id: 'step_fatal_exec', tool: 'send_email', params: {} };
      const task = { id: 'TASK-FATAL-02' };

      const fatalExecutor = async () => {
        attempts += 1;
        throw new Error('Unauthorized 401: Invalid Mermail API Key');
      };

      await assert.rejects(async () => {
        await engine.executeWithRetry(step, fatalExecutor, task);
      }, /Unauthorized 401/i);

      // Must execute exactly ONCE without retrying
      assert.equal(attempts, 1);
    });

    it('should escalate task when step failure exceeds retry limits in full execution', async () => {
      const task = {
        id: 'TASK-ESCALATE-01',
        state: WorkflowState.PLANNED,
        sender: 'treasury@company.com',
        subject: 'PayBox Rebalance',
        currentStepIndex: 0,
        plan: {
          steps: [
            { id: 's1', name: 'Query balances', tool: 'paybox_get_portfolio', params: {}, status: 'PENDING' }
          ]
        }
      };
      memory.saveTask(task.id, task);

      const alwaysFailingExecutor = async () => {
        throw new Error('Connection refused: RPC service is unreachable');
      };

      const result = await engine.executeTask(task.id, alwaysFailingExecutor);
      assert.equal(result.state, WorkflowState.ESCALATED);
      assert.ok(result.escalation);
      assert.equal(result.escalation.severity, 'HIGH');
      assert.match(result.escalation.whyEscalated, /RPC service is unreachable/i);

      // Verify task in memory was also updated to ESCALATED
      const savedTask = memory.getTask(task.id);
      assert.equal(savedTask.state, WorkflowState.ESCALATED);
    });
  });

  // Scenario 4: Dual-Control Approval Rejection Aborts Cleanly
  describe('Scenario 4: Dual-Control Approval Rejection & Execution Halt', () => {
    it('should halt execution cleanly when an operator rejects an approval request', async () => {
      const task = {
        id: 'TASK-APPROVAL-REJECT-01',
        state: WorkflowState.PLANNED,
        sender: 'defi@counterparty.fi',
        subject: 'Rebalance liquidity pool',
        currentStepIndex: 0,
        plan: {
          steps: [
            {
              id: 'step_transfer',
              name: 'Transfer 50 SOL',
              tool: 'paybox_request_transfer',
              requiresApproval: true,
              approvalStatus: ApprovalStatus.PENDING,
              params: { amount: 50, toAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
              status: 'PENDING'
            },
            {
              id: 'step_notify',
              name: 'Notify counterparty',
              tool: 'send_email',
              params: { to: 'defi@counterparty.fi' },
              status: 'PENDING'
            }
          ]
        }
      };
      memory.saveTask(task.id, task);

      // Step 1: Start execution - pauses at approval gate
      const pausedResult = await engine.executeTask(task.id, async () => ({ status: 'SUCCESS' }));
      assert.equal(pausedResult.state, WorkflowState.WAITING_APPROVAL);
      assert.ok(pausedResult.approvalToken);

      const token = pausedResult.approvalToken;

      // Step 2: Operator rejects approval
      const rejectResult = await opsAgent.rejectAndAbort(token, 'Chief_Risk_Officer', 'Unauthorized wallet address');
      assert.equal(rejectResult.status, 'REJECTED');
      assert.equal(rejectResult.token, token);

      // Step 3: Verify task state transitioned to FAILED with abortReason
      const rejectedTask = memory.getTask(task.id);
      assert.equal(rejectedTask.state, WorkflowState.FAILED);
      assert.equal(rejectedTask.abortReason, 'Unauthorized wallet address');

      // Step 4: Verify downstream steps were NOT executed
      assert.equal(rejectedTask.plan.steps[0].status, 'PENDING');
      assert.equal(rejectedTask.plan.steps[1].status, 'PENDING');
    });
  });

  // Scenario 5: Post-Execution Verification Failure Detection
  describe('Scenario 5: Post-Execution Verification Failure Detection (Rule #13)', () => {
    it('should fail verification when tool returns null, undefined, or explicit error', () => {
      const step = { tool: 'list_emails', id: 's1' };

      assert.throws(() => {
        engine.verifyToolExecution(step, null);
      }, /Verification failure.*null or undefined/i);

      assert.throws(() => {
        engine.verifyToolExecution(step, { error: 'Mailbox disconnected' });
      }, /Verification failure.*Mailbox disconnected/i);
    });

    it('should fail verification if email tool fails to confirm message delivery', () => {
      const step = { tool: 'send_email', id: 's_mail' };
      // Tool returned empty object without id or delivered flag
      assert.throws(() => {
        engine.verifyToolExecution(step, {});
      }, /Verification failure: Outbound email delivery could not be confirmed/i);

      // Verified when id is present
      const verified = engine.verifyToolExecution(step, { id: 'msg_delivered_123', status: 'sent' });
      assert.equal(verified.verified, true);
    });

    it('should fail verification if transfer request lacks cryptographic ID or hash', () => {
      const step = { tool: 'paybox_request_transfer', id: 's_tx' };
      assert.throws(() => {
        engine.verifyToolExecution(step, { status: 'unknown' });
      }, /Verification failure: PayBox transfer request missing cryptographic request ID or hash/i);

      const verified = engine.verifyToolExecution(step, { requestId: 'req_001_signed', txHash: '5K3...XYZ' });
      assert.equal(verified.verified, true);
    });

    it('should halt workflow execution and escalate if post-execution verification fails', async () => {
      const task = {
        id: 'TASK-VERIF-HALT-01',
        state: WorkflowState.PLANNED,
        sender: 'client@domain.com',
        subject: 'Draft proposal review',
        currentStepIndex: 0,
        plan: {
          steps: [
            {
              id: 's_draft',
              name: 'Save draft response',
              tool: 'save_draft',
              params: { to: 'client@domain.com' },
              status: 'PENDING'
            }
          ]
        }
      };
      memory.saveTask(task.id, task);

      // Tool returns malformed response without draft_id or saved status
      const faultyExecutor = async () => ({ status: 'partial_error' });

      const result = await engine.executeTask(task.id, faultyExecutor);
      assert.equal(result.state, WorkflowState.ESCALATED);
      assert.ok(result.escalation);
      assert.match(result.escalation.whyEscalated, /Verification failure: Draft creation not confirmed/i);
    });
  });

  // Scenario 6: Follow-up Auto-Cancellation Upon Inbound Reply
  describe('Scenario 6: Follow-Up Auto-Cancellation on Inbound Reply (Rule #15)', () => {
    it('should automatically cancel scheduled follow-up when counterparty replies to thread', () => {
      const threadId = 'thread_partner_collab_999';
      const recipient = 'alex@partner.org';

      // Schedule follow-up
      const fup = followup.scheduleFollowup({
        taskId: 'TASK-FUP-01',
        threadId,
        recipient,
        subject: 'Partnership Agreement Review',
        cadenceDays: 3,
        stopOnReply: true
      });

      assert.equal(fup.status, 'SCHEDULED');
      assert.equal(fup.threadId, threadId);

      // Inbound reply arrives from counterparty
      const cancelledList = followup.handleInboundReply(threadId, recipient);
      assert.equal(cancelledList.length, 1);
      assert.equal(cancelledList[0].id, fup.id);
      assert.equal(cancelledList[0].status, 'CANCELLED_BY_REPLY');
      assert.ok(cancelledList[0].cancelledAt);
      assert.match(cancelledList[0].cancelReason, /Inbound response received from alex@partner\.org/i);

      // Verify no follow-ups are due even if time is advanced
      followup.advanceTimeForTesting(5);
      const dueFollowups = followup.getDueFollowups();
      assert.equal(dueFollowups.length, 0);
    });
  });
});
