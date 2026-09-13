import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FollowUpEngine } from '../../src/followup.js';
import { IdempotencyGuard } from '../../src/idempotency.js';
import path from 'path';
import fs from 'fs';

describe('Follow-Up Engine & Idempotency Guard Unit Tests', () => {
  it('should schedule follow-up and auto-cancel when reply is received', () => {
    const testPath = path.resolve(process.cwd(), 'data', 'test_followups.json');
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);

    const engine = new FollowUpEngine(testPath);
    const fup = engine.scheduleFollowup({
      taskId: 'TASK-FUP-01',
      threadId: 'th_test_123',
      recipient: 'lead@corp.com',
      subject: 'Partnership Inquiry',
      cadenceDays: 3,
      stopOnReply: true
    });

    assert.equal(fup.status, 'SCHEDULED');
    assert.equal(fup.recipient, 'lead@corp.com');

    // Simulate inbound reply
    const cancelled = engine.handleInboundReply('th_test_123', 'lead@corp.com');
    assert.equal(cancelled.length, 1);
    assert.equal(cancelled[0].status, 'CANCELLED_BY_REPLY');

    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  });

  it('should prevent duplicate executions via deterministic idempotency keys', () => {
    const testPath = path.resolve(process.cwd(), 'data', 'test_idempotency.json');
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);

    const guard = new IdempotencyGuard(testPath);
    const key = guard.generateKey({
      taskId: 'TASK-001',
      stepId: 'step_send',
      action: 'send_email',
      target: 'client@domain.com',
      payload: { subject: 'Hello' }
    });

    assert.equal(guard.hasExecuted(key), false);

    // Record execution
    guard.recordExecution(key, { emailId: 'sent_123' });
    assert.equal(guard.hasExecuted(key), true);

    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  });

  it('should fast forward time for testing and execute due followups with escalation', () => {
    const testPath = path.resolve(process.cwd(), 'data', 'test_followups_time.json');
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);

    const engine = new FollowUpEngine(testPath);
    const fup = engine.scheduleFollowup({
      taskId: 'TASK-FUP-TIME',
      threadId: 'th_time_test',
      recipient: 'prospect@corp.com',
      subject: 'Demo Request',
      cadenceDays: 3,
      maxFollowups: 1,
      escalateOnMax: true
    });

    assert.equal(engine.getDueFollowups().length, 0);

    // Fast-forward time by 3 days
    const shifted = engine.advanceTimeForTesting(4);
    assert.equal(shifted, 1);

    const due = engine.getDueFollowups();
    assert.equal(due.length, 1);

    // Execute due follow-up
    const result = engine.executeFollowup(fup.id);
    assert.ok(result);
    assert.equal(result.followup.status, 'ESCALATED');
    assert.ok(result.draft.subject.includes('Demo Request'));

    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  });

  it('should prevent concurrent race conditions with in-flight locks', () => {
    const testPath = path.resolve(process.cwd(), 'data', 'test_idempotency_locks.json');
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);

    const guard = new IdempotencyGuard(testPath);
    const resourceKey = 'TASK-CONCURRENT-001';

    const lock1 = guard.acquireLock(resourceKey);
    assert.equal(lock1, true);

    // Second acquire on the same key must fail
    const lock2 = guard.acquireLock(resourceKey);
    assert.equal(lock2, false);

    // Release lock
    guard.releaseLock(resourceKey);

    // Can acquire again after release
    const lock3 = guard.acquireLock(resourceKey);
    assert.equal(lock3, true);
    guard.releaseLock(resourceKey);

    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  });
});

