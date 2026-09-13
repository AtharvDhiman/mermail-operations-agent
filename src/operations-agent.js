/**
 * Mermail Autonomous Operations Agent - Central Orchestrator
 * Coordinates inbox ingestion, planning, tool execution via Mermail MCP,
 * safety approvals, follow-up management, and resolution reporting.
 */

import { MermailClient } from './mermail-client.js';
import { workflowEngine } from './workflow-engine.js';
import { safety } from './safety.js';
import { followup } from './followup.js';
import { memory } from './memory.js';
import { audit } from './audit.js';
import { EmailComposer } from './composer.js';
import { SupportModeEngine } from './modes/support.js';
import { SalesGtmModeEngine } from './modes/sales-gtm.js';
import { SchedulingModeEngine } from './modes/scheduling.js';
import { GeneralOpsModeEngine } from './modes/general-ops.js';
import { logger } from './logger.js';

export class MermailOperationsAgent {
  constructor(config = {}) {
    this.config = config;
    this.client = new MermailClient(config);
    this.activeMailboxId = config.mailboxId || 'mbx_ops_sentinel_01';
  }

  /**
   * Scans inbox, triages messages, generates execution plans, and executes safe steps
   */
  async processIncomingEmail(email) {
    logger.info(`Agent received email: "${email.subject}" from ${email.from}`, { emailId: email.id });

    // Ingest, triage, and plan task
    const task = await workflowEngine.ingestAndPlan(email);

    if (task.state === 'ESCALATED') {
      logger.warn(`Task immediately escalated during ingestion: ${task.escalation?.whyEscalated}`, { taskId: task.taskId });
      return task;
    }

    if (task.state === 'COMPLETED' || task.state === 'WAITING_FOR_REPLY') {
      logger.info(`Task ${task.id} is already ${task.state}, returning without re-executing.`, { taskId: task.id });
      return { task, state: task.state, alreadyProcessed: true };
    }

    if (task.state === 'WAITING_APPROVAL') {
      const pendingStep = task.plan?.steps?.find(s => s.status === 'PENDING' && s.requiresApproval);
      const approval = pendingStep?.approvalToken ? safety.getApproval(pendingStep.approvalToken) : null;
      return {
        task,
        state: task.state,
        approvalToken: pendingStep?.approvalToken,
        approvalPreview: approval?.preview,
        alreadyProcessed: true
      };
    }

    // Execute planned workflow with Mermail MCP tool runner
    const executionResult = await workflowEngine.executeTask(task.id, async (toolName, params, activeTask) => {
      return await this.executeMcpTool(toolName, params, activeTask);
    });

    return executionResult;
  }

  /**
   * Dispatches tool executions to Mermail MCP endpoints or specialized mode handlers
   */
  async executeMcpTool(toolName, params, task) {
    logger.debug(`Dispatching tool: ${toolName}`, { taskId: task.id });

    switch (toolName) {
      case 'save_draft': {
        const draftContent = EmailComposer.compose({
          category: task.category,
          recipient: task.sender,
          subject: params.subject || task.subject,
          entities: task.entities
        });
        return await this.client.callTool('save_draft', {
          mailboxId: this.activeMailboxId,
          body: {
            to: params.to || task.sender,
            subject: draftContent.subject,
            text: draftContent.body
          }
        });
      }

      case 'reply_to_email': {
        const responseContent = EmailComposer.compose({
          category: task.category,
          recipient: task.sender,
          subject: params.subject || task.subject,
          entities: task.entities
        });
        return await this.client.callTool('reply_to_email', {
          emailId: params.emailId || task.emailId,
          body: {
            text: responseContent.body
          }
        });
      }

      case 'send_email': {
        const emailContent = EmailComposer.compose({
          category: task.category,
          recipient: params.to || task.sender,
          subject: params.subject || task.subject,
          entities: task.entities
        });
        return await this.client.callTool('send_email', {
          body: {
            to: params.to || task.sender,
            subject: emailContent.subject,
            text: emailContent.body
          }
        });
      }

      case 'schedule_email_send': {
        return await this.client.callTool('schedule_email_send', {
          mailboxId: this.activeMailboxId,
          sendAt: params.sendAt,
          body: params.body
        });
      }

      case 'paybox_get_portfolio': {
        return await this.client.callTool('paybox_get_portfolio', params);
      }

      case 'paybox_request_transfer': {
        return await this.client.callTool('paybox_request_transfer', {
          chain: params.chain || 'solana',
          token: params.token || 'SOL',
          amount: params.amount,
          destinationAddress: params.toAddress
        });
      }

      case 'paybox_request_swap': {
        return await this.client.callTool('paybox_request_swap', params);
      }

      case 'paybox_get_request': {
        return await this.client.callTool('paybox_get_request', {
          requestId: params.requestId || 'req_tx_latest'
        });
      }

      // Specialized Mode Steps
      case 'qualify_lead': {
        return SalesGtmModeEngine.qualifyLead(task);
      }

      case 'read_calendar_constraints': {
        return SchedulingModeEngine.resolveSlots(task);
      }

      case 'triage_support_issue': {
        return SupportModeEngine.processTicket(task);
      }

      case 'register_followup': {
        return { registered: true, cadenceDays: params.cadenceDays || 3 };
      }

      default:
        logger.warn(`Unknown tool requested: ${toolName}, falling back to client call.`, { taskId: task.id });
        return await this.client.callTool(toolName, params);
    }
  }

  /**
   * Resumes a task that was paused awaiting operator approval
   */
  async approveAndResume(token, operator = 'operator') {
    const pendingApproval = safety.getApproval(token);
    if (!pendingApproval) {
      throw new Error(`Approval token '${token}' not found.`);
    }
    const task = memory.getTask(pendingApproval.taskId);
    if (!task) {
      throw new Error(`Task ${pendingApproval.taskId} not found.`);
    }
    if (task.state !== 'WAITING_APPROVAL') {
      throw new Error(`Cannot approve task ${task.id}: task is in '${task.state}' state, expected 'WAITING_APPROVAL'.`);
    }

    const approval = safety.approve(token, operator);

    // Mark step approved in task plan
    const step = task.plan?.steps?.find(s => s.approvalToken === token);
    if (step) {
      step.approvalStatus = 'APPROVED';
      memory.saveTask(task.id, task);
    }

    // Resume execution
    logger.info(`Resuming task ${task.id} after approval [${token}]`, { taskId: task.id });
    return await workflowEngine.executeTask(task.id, async (toolName, params, activeTask) => {
      return await this.executeMcpTool(toolName, params, activeTask);
    });
  }

  /**
   * Rejects an approval and halts task execution
   */
  async rejectAndAbort(token, operator = 'operator', reason = 'Rejected by operator') {
    const approval = safety.reject(token, operator, reason);
    const task = memory.getTask(approval.taskId);
    if (task) {
      workflowEngine.transitionState(task, 'FAILED', reason);
      task.abortReason = reason;
      memory.saveTask(task.id, task);
    }
    return { status: 'REJECTED', token, taskId: approval.taskId, reason };
  }

  /**
   * Polls Mermail inbox for unread messages and processes them
   */
  async pollInbox() {
    const result = await this.client.callTool('list_emails', {
      query: { isRead: false, limit: 10 }
    });
    const emails = result.emails || [];
    logger.info(`Polled inbox: ${emails.length} unread message(s) found.`);

    const results = [];
    for (const email of emails) {
      const res = await this.processIncomingEmail(email);
      results.push(res);
    }
    return results;
  }
}

export const agent = new MermailOperationsAgent();
