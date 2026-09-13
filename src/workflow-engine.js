/**
 * Workflow State Machine & Failure Recovery Engine
 * Implements deterministic 11-step finite state machine with exponential backoff,
 * error classification, checkpoint resumption, and automatic escalation.
 */

import { WorkflowState, ActionRiskLevel, ApprovalStatus } from './types.js';
import { InboxTriage } from './triage.js';
import { TaskPlanner } from './planner.js';
import { safety } from './safety.js';
import { idempotency } from './idempotency.js';
import { followup } from './followup.js';
import { memory } from './memory.js';
import { audit } from './audit.js';
import { EscalationEngine } from './escalation.js';
import { EmailComposer } from './composer.js';
import { logger } from './logger.js';

export const ALLOWED_TRANSITIONS = {
  [WorkflowState.RECEIVED]: [WorkflowState.CLASSIFIED, WorkflowState.CONTEXT_LOADED, WorkflowState.SECURITY_CHECK, WorkflowState.ESCALATED, WorkflowState.FAILED, WorkflowState.CANCELLED],
  [WorkflowState.CLASSIFIED]: [WorkflowState.CONTEXT_LOADED, WorkflowState.PLANNED, WorkflowState.SECURITY_CHECK, WorkflowState.ESCALATED, WorkflowState.FAILED, WorkflowState.CANCELLED],
  [WorkflowState.CONTEXT_LOADED]: [WorkflowState.PLANNED, WorkflowState.SECURITY_CHECK, WorkflowState.ESCALATED, WorkflowState.FAILED, WorkflowState.CANCELLED],
  [WorkflowState.PLANNED]: [WorkflowState.SECURITY_CHECK, WorkflowState.EXECUTING, WorkflowState.WAITING_APPROVAL, WorkflowState.ESCALATED, WorkflowState.FAILED, WorkflowState.CANCELLED],
  [WorkflowState.SECURITY_CHECK]: [WorkflowState.PLANNED, WorkflowState.WAITING_APPROVAL, WorkflowState.EXECUTING, WorkflowState.ESCALATED, WorkflowState.FAILED, WorkflowState.CANCELLED],
  [WorkflowState.WAITING_APPROVAL]: [WorkflowState.EXECUTING, WorkflowState.FAILED, WorkflowState.ESCALATED, WorkflowState.CANCELLED],
  [WorkflowState.EXECUTING]: [WorkflowState.VERIFYING, WorkflowState.WAITING_APPROVAL, WorkflowState.RETRYING, WorkflowState.FAILED, WorkflowState.ESCALATED, WorkflowState.CANCELLED],
  [WorkflowState.RETRYING]: [WorkflowState.EXECUTING, WorkflowState.FAILED, WorkflowState.ESCALATED, WorkflowState.CANCELLED],
  [WorkflowState.VERIFYING]: [WorkflowState.WAITING_FOR_REPLY, WorkflowState.FOLLOW_UP_REQUIRED, WorkflowState.COMPLETED, WorkflowState.FAILED, WorkflowState.ESCALATED, WorkflowState.CANCELLED],
  [WorkflowState.WAITING_FOR_REPLY]: [WorkflowState.FOLLOW_UP_REQUIRED, WorkflowState.COMPLETED, WorkflowState.ESCALATED, WorkflowState.CANCELLED],
  [WorkflowState.FOLLOW_UP_REQUIRED]: [WorkflowState.EXECUTING, WorkflowState.COMPLETED, WorkflowState.ESCALATED, WorkflowState.CANCELLED],
  [WorkflowState.COMPLETED]: [],
  [WorkflowState.FAILED]: [WorkflowState.RETRYING, WorkflowState.ESCALATED, WorkflowState.CANCELLED],
  [WorkflowState.ESCALATED]: [WorkflowState.EXECUTING, WorkflowState.COMPLETED, WorkflowState.FAILED, WorkflowState.CANCELLED],
  [WorkflowState.CANCELLED]: []
};

export class WorkflowEngine {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseBackoffMs = options.baseBackoffMs || 200;
  }

  /**
   * Validates and executes an explicit state machine transition
   */
  transitionState(task, toState, reason = '') {
    const fromState = task.state;
    const allowed = ALLOWED_TRANSITIONS[fromState] || [];
    if (!allowed.includes(toState)) {
      logger.warn(`Invalid state transition attempted: ${fromState} -> ${toState}`, { taskId: task.id, fromState, toState });
      throw new Error(`Invalid state transition from '${fromState}' to '${toState}'. Allowed: [${allowed.join(', ')}]`);
    }

    if (!task.stateHistory) {
      task.stateHistory = [];
    }
    task.stateHistory.push({
      from: fromState,
      to: toState,
      timestamp: new Date().toISOString(),
      reason
    });
    task.state = toState;
    memory.saveTask(task.id, task);
    return task;
  }

  /**
   * Initializes a workflow from an inbound email with deduplication & prompt injection guards
   */
  async ingestAndPlan(email) {
    // 0. Deduplicate identical inbound message
    const msgKey = idempotency.generateMessageKey(email);
    if (idempotency.hasProcessedMessage(msgKey)) {
      const existingRecord = idempotency.getExecution(`msg:${msgKey}`);
      if (existingRecord?.taskId) {
        const existingTask = memory.getTask(existingRecord.taskId);
        if (existingTask) {
          logger.info(`Duplicate message detected via idempotency guard, returning existing task ${existingTask.id}`, { taskId: existingTask.id });
          return existingTask;
        }
      }
    }

    audit.record({
      action: 'EMAIL_RECEIVED',
      tool: 'mermail_inbox',
      details: { from: email.from, subject: email.subject }
    });

    // 1. Security scan for prompt injection
    const textToScan = `${email.subject || ''} ${email.body || email.content || ''}`;
    const injectionCheck = safety.constructor.detectPromptInjection(textToScan);
    if (injectionCheck.detected) {
      const taskId = `SEC-ALERT-${Date.now()}`;
      audit.record({
        taskId,
        action: 'SECURITY_ALERT_TRIGGERED',
        status: 'FAILED',
        actor: 'SECURITY_GUARD',
        details: { matches: injectionCheck.matches }
      });

      const escalation = EscalationEngine.buildEscalationReport({
        taskId,
        subject: email.subject,
        sender: email.from,
        reason: `Adversarial prompt injection pattern detected: [${injectionCheck.matches.join(', ')}]`,
        severity: 'CRITICAL',
        pendingAction: 'Quarantine message and review sender security reputation.'
      });

      return {
        state: WorkflowState.ESCALATED,
        taskId,
        escalation
      };
    }

    // 2. Intelligent Inbox Triage
    const task = InboxTriage.triageEmail(email);
    task.state = WorkflowState.CLASSIFIED;
    task.stateHistory = [
      { from: WorkflowState.RECEIVED, to: WorkflowState.CLASSIFIED, timestamp: new Date().toISOString(), reason: 'Initial triage' }
    ];
    memory.saveTask(task.id, task);
    idempotency.recordMessage(msgKey, task.id);

    audit.record({
      taskId: task.id,
      threadId: task.threadId,
      action: 'EMAIL_CLASSIFIED',
      details: { category: task.category, urgency: task.urgency, priority: task.priority }
    });

    // 3. Autonomous Planning
    const plan = TaskPlanner.planTask(task);
    task.plan = plan;
    this.transitionState(task, WorkflowState.PLANNED, 'Autonomous plan generated');
    task.currentStepIndex = 0;
    task.retryCount = 0;
    memory.saveTask(task.id, task);

    audit.record({
      taskId: task.id,
      threadId: task.threadId,
      action: 'TASK_PLANNED',
      details: { totalSteps: plan.totalSteps, goal: plan.goal }
    });

    return task;
  }

  /**
   * Executes the next pending steps in a planned task
   */
  async executeTask(taskId, toolExecutor) {
    const task = memory.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in active memory.`);
    }

    if (!idempotency.acquireLock(taskId)) {
      logger.warn(`Task ${taskId} is currently executing in another process, skipping concurrent run.`, { taskId });
      return { task, state: task.state, warning: 'CONCURRENT_EXECUTION_BLOCKED' };
    }

    try {
      if (task.state !== WorkflowState.EXECUTING) {
        this.transitionState(task, WorkflowState.EXECUTING, 'Starting step execution');
      }

      const steps = task.plan?.steps || [];

      while (task.currentStepIndex < steps.length) {
        const step = steps[task.currentStepIndex];

        // Skip already executed steps (checkpoint resumption)
        if (step.status === 'EXECUTED') {
          task.currentStepIndex += 1;
          continue;
        }

        // Check for Idempotency
        const idemKey = idempotency.generateKey({
          taskId: task.id,
          stepId: step.id,
          action: step.tool,
          target: step.params?.to || step.params?.toAddress || '',
          payload: step.params
        });

        if (idempotency.hasExecuted(idemKey)) {
          logger.info(`Step [${step.id}] previously executed, skipping via idempotency guard.`, { taskId: task.id });
          step.status = 'EXECUTED';
          task.currentStepIndex += 1;
          continue;
        }

        // Check Human-in-the-loop Safety Gate
        if (step.requiresApproval && step.approvalStatus !== ApprovalStatus.APPROVED) {
          this.transitionState(task, WorkflowState.WAITING_APPROVAL, `Step [${step.id}] requires operator dual-control authorization`);
          const approvalRequest = safety.createApprovalRequest({
            taskId: task.id,
            action: step.tool,
            target: step.params?.to || step.params?.toAddress || 'external',
            payload: step.params,
            rationale: step.name,
            riskReason: step.riskReason
          });

          step.approvalToken = approvalRequest.token;
          step.approvalStatus = ApprovalStatus.PENDING;
          memory.saveTask(task.id, task);

          audit.record({
            taskId: task.id,
            threadId: task.threadId,
            action: 'APPROVAL_REQUESTED',
            tool: step.tool,
            status: 'PENDING_APPROVAL',
            details: { token: approvalRequest.token, preview: approvalRequest.preview }
          });

          return {
            task,
            state: WorkflowState.WAITING_APPROVAL,
            approvalToken: approvalRequest.token,
            approvalPreview: approvalRequest.preview,
            pausedAtStep: step.id
          };
        }

        // Execute Step with Self-Healing Retry
        try {
          logger.info(`Executing step [${step.id}]: ${step.name}`, { taskId: task.id, tool: step.tool });
          const result = await this.executeWithRetry(step, toolExecutor, task);
          const verification = this.verifyToolExecution(step, result);

          step.status = 'EXECUTED';
          step.result = result;
          step.verification = verification;
          idempotency.recordExecution(idemKey, result);

          audit.record({
            taskId: task.id,
            threadId: task.threadId,
            action: 'STEP_EXECUTED',
            tool: step.tool,
            status: 'SUCCESS',
            details: { stepId: step.id, resultSummary: result?.status || 'OK' }
          });

          audit.record({
            taskId: task.id,
            threadId: task.threadId,
            action: 'ACTION_VERIFIED',
            tool: step.tool,
            status: 'SUCCESS',
            details: { stepId: step.id, verified: true }
          });

          // If step registers a follow-up, invoke follow-up engine
          if (step.tool === 'register_followup') {
            const fup = followup.scheduleFollowup({
              taskId: task.id,
              threadId: task.threadId,
              recipient: task.sender,
              subject: task.subject,
              category: task.category,
              cadenceDays: step.params?.cadenceDays || 3,
              maxFollowups: step.params?.maxFollowups || 2,
              stopOnReply: step.params?.stopOnReply !== false
            });
            step.followupRecord = fup;
          }

          task.currentStepIndex += 1;
          task.retryCount = 0; // Reset retries on success
          memory.saveTask(task.id, task);

        } catch (err) {
          logger.error(`Step [${step.id}] failed: ${err.message}`, { taskId: task.id, error: err });
          this.transitionState(task, WorkflowState.FAILED, `Step execution failed: ${err.message}`);

          const escalation = EscalationEngine.buildEscalationReport({
            taskId: task.id,
            subject: task.subject,
            sender: task.sender,
            reason: `Step execution failed after retries: ${err.message}`,
            severity: 'HIGH',
            completedSteps: steps.slice(0, task.currentStepIndex),
            pendingAction: `Manual retry or manual execution of tool '${step.tool}'.`
          });

          this.transitionState(task, WorkflowState.ESCALATED, 'Escalated following execution failure');
          task.escalation = escalation;
          memory.saveTask(task.id, task);

          audit.record({
            taskId: task.id,
            threadId: task.threadId,
            action: 'WORKFLOW_ESCALATED',
            tool: step.tool,
            status: 'FAILED',
            error: err.message
          });

          return {
            task,
            state: WorkflowState.ESCALATED,
            escalation
          };
        }
      }

      // All steps executed: Verification & Completion
      this.transitionState(task, WorkflowState.VERIFYING, 'Verifying DAG execution outcomes');
      logger.info(`Verifying completion criteria for task ${task.id}`, { taskId: task.id });

      // Transition to final state
      if (steps.some(s => s.tool === 'register_followup')) {
        this.transitionState(task, WorkflowState.WAITING_FOR_REPLY, 'Follow-up registered, waiting for counterparty reply');
      } else {
        this.transitionState(task, WorkflowState.COMPLETED, 'All planned steps verified successfully');
      }

      task.completedAt = new Date().toISOString();
      memory.saveTask(task.id, task);

      audit.record({
        taskId: task.id,
        threadId: task.threadId,
        action: 'WORKFLOW_COMPLETED',
        status: 'SUCCESS',
        details: { finalState: task.state }
      });

      return {
        task,
        state: task.state,
        summary: `Successfully completed ${steps.length} steps for ${task.category} task.`
      };
    } finally {
      idempotency.releaseLock(taskId);
    }
  }

  /**
   * Executes a tool with exponential backoff & jitter for transient failures
   */
  async executeWithRetry(step, toolExecutor, task) {
    let attempts = 0;
    let lastError = null;

    while (attempts <= this.maxRetries) {
      try {
        if (!toolExecutor || typeof toolExecutor !== 'function') {
          // Default mock handler if no external tool runner provided
          return { status: 'SUCCESS', tool: step.tool, executedAt: new Date().toISOString() };
        }
        return await toolExecutor(step.tool, step.params, task);
      } catch (err) {
        attempts += 1;
        lastError = err;

        // Classify failure: Transient vs Fatal
        const failureType = this.classifyError(err);
        if (failureType === 'FATAL' || attempts > this.maxRetries) {
          throw err;
        }

        const jitter = Math.floor(Math.random() * 50);
        const backoff = (this.baseBackoffMs * Math.pow(2, attempts)) + jitter;
        logger.warn(`Transient error in [${step.tool}], retrying in ${backoff}ms (attempt ${attempts}/${this.maxRetries})...`, { taskId: task.id });
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }

    throw lastError;
  }

  classifyError(err) {
    const msg = (err?.message || '').toLowerCase();
    if (
      msg.includes('auth') ||
      msg.includes('forbidden') ||
      msg.includes('unauthorized') ||
      msg.includes('invalid address') ||
      msg.includes('allowlist') ||
      msg.includes('prompt injection') ||
      msg.includes('security violation')
    ) {
      return 'FATAL';
    }

    if (
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('network') ||
      msg.includes('temporary')
    ) {
      return 'TRANSIENT';
    }

    return 'TRANSIENT';
  }

  isTransientError(err) {
    return this.classifyError(err) === 'TRANSIENT';
  }

  /**
   * Post-execution verification (Rule #13)
   */
  verifyToolExecution(step, result) {
    if (!result) {
      throw new Error(`Verification failure: Tool '${step.tool}' returned null or undefined result.`);
    }
    if (result.error) {
      throw new Error(`Verification failure: Tool '${step.tool}' returned error: ${result.error}`);
    }
    if (step.tool === 'reply_to_email' || step.tool === 'send_email') {
      if (!result.id && !result.delivered && result.status !== 'sent') {
        throw new Error(`Verification failure: Outbound email delivery could not be confirmed via tool '${step.tool}'.`);
      }
    }
    if (step.tool === 'save_draft') {
      if (!result.draft_id && result.status !== 'saved') {
        throw new Error(`Verification failure: Draft creation not confirmed for tool '${step.tool}'.`);
      }
    }
    if (step.tool === 'paybox_request_transfer') {
      if (!result.requestId && !result.txHash && result.status !== 'success' && result.status !== 'pending_signature') {
        throw new Error(`Verification failure: PayBox transfer request missing cryptographic request ID or hash.`);
      }
    }
    return { verified: true, verifiedAt: new Date().toISOString() };
  }
}

export const workflowEngine = new WorkflowEngine();
