import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WorkflowEngine } from '../../src/workflow-engine.js';
import { WorkflowState } from '../../src/types.js';
import { memory } from '../../src/memory.js';

describe('Workflow Finite State Machine & Error Recovery Unit Tests', () => {
  describe('FSM Transitions', () => {
    it('should validate and record valid state transitions', () => {
      const engine = new WorkflowEngine();
      const task = {
        id: 'TASK-FSM-01',
        state: WorkflowState.RECEIVED,
        stateHistory: []
      };

      engine.transitionState(task, WorkflowState.CLASSIFIED, 'Triaged successfully');
      assert.equal(task.state, WorkflowState.CLASSIFIED);
      assert.equal(task.stateHistory.length, 1);
      assert.equal(task.stateHistory[0].from, WorkflowState.RECEIVED);
      assert.equal(task.stateHistory[0].to, WorkflowState.CLASSIFIED);

      engine.transitionState(task, WorkflowState.PLANNED, 'Plan generated');
      assert.equal(task.state, WorkflowState.PLANNED);

      engine.transitionState(task, WorkflowState.EXECUTING, 'Starting steps');
      assert.equal(task.state, WorkflowState.EXECUTING);

      engine.transitionState(task, WorkflowState.VERIFYING, 'Verifying outcomes');
      assert.equal(task.state, WorkflowState.VERIFYING);

      engine.transitionState(task, WorkflowState.COMPLETED, 'All done');
      assert.equal(task.state, WorkflowState.COMPLETED);
    });

    it('should reject illegal state transitions', () => {
      const engine = new WorkflowEngine();
      const task = {
        id: 'TASK-FSM-02',
        state: WorkflowState.RECEIVED,
        stateHistory: []
      };

      // Illegal skip from RECEIVED directly to COMPLETED
      assert.throws(() => {
        engine.transitionState(task, WorkflowState.COMPLETED, 'Skipping directly');
      }, /Invalid state transition/);

      // Illegal transition out of COMPLETED terminal state
      task.state = WorkflowState.COMPLETED;
      assert.throws(() => {
        engine.transitionState(task, WorkflowState.EXECUTING, 'Restarting completed task');
      }, /Invalid state transition/);
    });
  });

  describe('Error Classification & Exponential Backoff', () => {
    it('should distinguish between transient and fatal errors', () => {
      const engine = new WorkflowEngine();

      const rateLimitErr = new Error('HTTP 429: Rate limit exceeded');
      assert.equal(engine.classifyError(rateLimitErr), 'TRANSIENT');
      assert.equal(engine.isTransientError(rateLimitErr), true);

      const timeoutErr = new Error('Gateway Timeout 504 on RPC call');
      assert.equal(engine.classifyError(timeoutErr), 'TRANSIENT');

      const authErr = new Error('Forbidden 403: Invalid authentication key');
      assert.equal(engine.classifyError(authErr), 'FATAL');
      assert.equal(engine.isTransientError(authErr), false);

      const injectionErr = new Error('Security Violation: prompt injection attempt blocked');
      assert.equal(engine.classifyError(injectionErr), 'FATAL');
    });

    it('should retry transient errors with backoff and succeed', async () => {
      const engine = new WorkflowEngine({ maxRetries: 3, baseBackoffMs: 10 });
      const step = { id: 'step_retry_1', tool: 'list_emails', params: {} };
      const task = { id: 'TASK-RETRY-01' };

      let callCount = 0;
      const toolExecutor = async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary 503 Service Unavailable');
        }
        return { status: 'SUCCESS', count: 5 };
      };

      const result = await engine.executeWithRetry(step, toolExecutor, task);
      assert.equal(callCount, 3);
      assert.equal(result.status, 'SUCCESS');
      assert.equal(result.count, 5);
    });

    it('should immediately fail on fatal errors without retrying', async () => {
      const engine = new WorkflowEngine({ maxRetries: 3, baseBackoffMs: 10 });
      const step = { id: 'step_fatal_1', tool: 'send_email', params: {} };
      const task = { id: 'TASK-FATAL-01' };

      let callCount = 0;
      const toolExecutor = async () => {
        callCount++;
        throw new Error('Unauthorized 401: Invalid API Key');
      };

      await assert.rejects(async () => {
        await engine.executeWithRetry(step, toolExecutor, task);
      }, /Unauthorized 401/);

      // Must NOT retry fatal errors
      assert.equal(callCount, 1);
    });
  });

  describe('Inbound Message Deduplication', () => {
    it('should return existing task when identical message is re-ingested', async () => {
      const engine = new WorkflowEngine();
      const email = {
        id: `msg_dedup_${Date.now()}`,
        from: 'vip@partner.com',
        subject: 'Partnership SLA Sync',
        body: 'Can we schedule 15 minutes to review the SLA?'
      };

      const task1 = await engine.ingestAndPlan(email);
      assert.ok(task1.id);

      // Re-ingest exact same email
      const task2 = await engine.ingestAndPlan(email);
      assert.equal(task2.id, task1.id);
    });
  });
});
