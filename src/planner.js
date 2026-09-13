/**
 * Autonomous Task Planner
 * Deconstructs high-level goals into ordered execution DAGs, assigns Mermail tools,
 * assesses step-level risks, and defines verification criteria.
 */

import { AgentMode, ActionRiskLevel } from './types.js';
import { SafetyEngine } from './safety.js';
import { logger } from './logger.js';

export class TaskPlanner {
  /**
   * Generates a structured multi-step execution plan for a triaged task
   */
  static planTask(task) {
    const steps = [];
    const category = task.category || AgentMode.SUPPORT;
    const recipient = task.sender || 'recipient@example.com';
    const emailId = task.emailId;
    const threadId = task.threadId;

    // Handle No-Action / Informational newsletters
    if (task.isNoAction || task.requiredActions?.no_action) {
      steps.push(
        this.createStep({
          id: 'step_1',
          name: 'Log informational communication and archive',
          tool: 'log_informational_entry',
          params: { subject: task.subject, from: recipient },
          verificationCriteria: 'Communication archived with no external actions required',
          expectedOutcome: 'Message cataloged in memory without sending external replies'
        })
      );

      return {
        taskId: task.id,
        category,
        goal: `Archive informational communication: "${task.subject}"`,
        totalSteps: steps.length,
        steps,
        createdAt: new Date().toISOString()
      };
    }

    switch (category) {
      case AgentMode.SCHEDULING:
        steps.push(
          this.createStep({
            id: 'step_1',
            name: 'Check availability & calendar constraints',
            tool: 'read_calendar_constraints',
            params: { targetTime: task.entities?.timeSlot || 'preferred' },
            verificationCriteria: 'Calendar slots verified for conflict absence',
            expectedOutcome: 'Confirmed candidate slots with zero calendar collisions'
          }),
          this.createStep({
            id: 'step_2',
            name: 'Compose & save scheduling proposal draft',
            tool: 'save_draft',
            dependsOn: ['step_1'],
            params: {
              threadId,
              to: recipient,
              subject: `Re: ${task.subject}`,
              intent: 'propose_meeting_slots'
            },
            verificationCriteria: 'Draft successfully saved in Mermail mailbox',
            expectedOutcome: 'Contextual email draft saved in Mermail mailbox'
          }),
          this.createStep({
            id: 'step_3',
            name: 'Dispatch scheduling proposal email',
            tool: 'reply_to_email',
            dependsOn: ['step_2'],
            params: {
              emailId,
              to: recipient,
              subject: `Re: ${task.subject}`
            },
            verificationCriteria: 'Message dispatched and delivery confirmed',
            expectedOutcome: 'Response delivered to counterparty via Mermail'
          }),
          this.createStep({
            id: 'step_4',
            name: 'Register Day 2 meeting confirmation follow-up',
            tool: 'register_followup',
            dependsOn: ['step_3'],
            params: {
              cadenceDays: 2,
              stopOnReply: true,
              threadId
            },
            verificationCriteria: 'Follow-up registered in persistent scheduler',
            expectedOutcome: 'Active follow-up cadence monitoring for counterparty reply',
            followupSpec: {
              contact: recipient,
              followUpDate: new Date(Date.now() + 2 * 86400000).toISOString().substring(0, 10),
              condition: 'No response received within 48 hours',
              action: 'Dispatch gentle reminder ping',
              expectedOutcome: 'Meeting slot confirmed or rescheduled'
            }
          })
        );
        break;

      case AgentMode.SALES_GTM:
        steps.push(
          this.createStep({
            id: 'step_1',
            name: 'Enrich lead profile & qualify intent',
            tool: 'qualify_lead',
            params: { sender: recipient, subject: task.subject },
            verificationCriteria: 'Lead profile saved to memory',
            expectedOutcome: 'ICP qualification score and account tier calculated'
          }),
          this.createStep({
            id: 'step_2',
            name: 'Draft tailored outreach / product proposal',
            tool: 'save_draft',
            dependsOn: ['step_1'],
            params: {
              threadId,
              to: recipient,
              subject: `Re: ${task.subject}`,
              intent: 'sales_outreach'
            },
            verificationCriteria: 'Contextual draft saved to Mermail mailbox',
            expectedOutcome: 'Personalized value proposition draft saved in mailbox'
          }),
          this.createStep({
            id: 'step_3',
            name: 'Send sales communication to lead',
            tool: 'send_email',
            dependsOn: ['step_2'],
            params: {
              to: recipient,
              subject: `Re: ${task.subject}`
            },
            verificationCriteria: 'Outbound email sent to lead',
            expectedOutcome: 'Verified outbound delivery of sales pitch and demo invite'
          }),
          this.createStep({
            id: 'step_4',
            name: 'Activate Day 3 & Day 7 sales follow-up cadence',
            tool: 'register_followup',
            dependsOn: ['step_3'],
            params: {
              cadenceDays: 3,
              maxFollowups: 2,
              stopOnReply: true,
              threadId
            },
            verificationCriteria: 'Cadence registered in follow-up engine',
            expectedOutcome: 'Automated 2-tier sales follow-up cadence scheduled',
            followupSpec: {
              contact: recipient,
              followUpDate: new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10),
              condition: 'Lead has not replied within 3 days',
              action: 'Send follow-up check-in with additional case study',
              expectedOutcome: 'Lead engagement or qualification closure'
            }
          })
        );
        break;

      case AgentMode.GENERAL_OPS:
        steps.push(
          this.createStep({
            id: 'step_1',
            name: 'Inspect relayer balances & PayBox treasury liquidity',
            tool: 'paybox_get_portfolio',
            params: { chain: 'solana' },
            verificationCriteria: 'Treasury balances retrieved and deficit verified',
            expectedOutcome: 'Live treasury liquidity confirmed sufficient for top-up'
          }),
          this.createStep({
            id: 'step_2',
            name: 'Prepare gas replenishment transfer proposal',
            tool: 'paybox_request_transfer',
            dependsOn: ['step_1'],
            params: {
              toAddress: task.entities?.solanaAddress || 'Authorized_Relayer',
              amount: task.entities?.amount || 1.5,
              token: task.entities?.asset || 'SOL'
            },
            verificationCriteria: 'Transfer proposal prepared with dual-control review',
            expectedOutcome: 'Signing deep-link generated for operator authorization'
          }),
          this.createStep({
            id: 'step_3',
            name: 'Verify on-chain settlement & extract transaction hash',
            tool: 'paybox_get_request',
            dependsOn: ['step_2'],
            params: { timeoutMs: 30000 },
            verificationCriteria: 'Terminal settlement on-chain verified',
            expectedOutcome: 'On-chain transaction hash extracted and verified'
          }),
          this.createStep({
            id: 'step_4',
            name: 'Dispatch official settlement receipt & close alert',
            tool: 'reply_to_email',
            dependsOn: ['step_3'],
            params: {
              emailId,
              to: recipient,
              subject: `[RESOLVED] ${task.subject}`
            },
            verificationCriteria: 'Resolution email delivered to operator',
            expectedOutcome: 'Delivery of audit receipt to the alerting thread'
          })
        );
        break;

      case AgentMode.SUPPORT:
      default:
        steps.push(
          this.createStep({
            id: 'step_1',
            name: 'Analyze issue details & search solution knowledge base',
            tool: 'triage_support_issue',
            params: { subject: task.subject, body: task.rawEmail?.body },
            verificationCriteria: 'Resolution path identified',
            expectedOutcome: 'SLA priority and targeted troubleshooting guide extracted'
          }),
          this.createStep({
            id: 'step_2',
            name: 'Compose & save support resolution draft',
            tool: 'save_draft',
            dependsOn: ['step_1'],
            params: {
              threadId,
              to: recipient,
              subject: `Re: ${task.subject}`,
              intent: 'support_troubleshooting'
            },
            verificationCriteria: 'Support draft saved in mailbox',
            expectedOutcome: 'Context-aware troubleshooting draft saved in mailbox'
          }),
          this.createStep({
            id: 'step_3',
            name: 'Send verified solution response to user',
            tool: 'reply_to_email',
            dependsOn: ['step_2'],
            params: {
              emailId,
              to: recipient,
              subject: `Re: ${task.subject}`
            },
            verificationCriteria: 'Support reply sent',
            expectedOutcome: 'Support reply delivered to customer'
          }),
          this.createStep({
            id: 'step_4',
            name: 'Schedule Day 3 resolution confirmation follow-up',
            tool: 'register_followup',
            dependsOn: ['step_3'],
            params: {
              cadenceDays: 3,
              stopOnReply: true,
              threadId
            },
            verificationCriteria: 'Support satisfaction check scheduled',
            expectedOutcome: 'Follow-up registered to confirm customer issue resolution',
            followupSpec: {
              contact: recipient,
              followUpDate: new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10),
              condition: 'User has not confirmed ticket resolution',
              action: 'Check in on satisfaction and close ticket if resolved',
              expectedOutcome: 'Ticket resolution confirmed or reopened'
            }
          })
        );
        break;
    }

    const plan = {
      taskId: task.id,
      category,
      goal: `Resolve ${category} task for ${recipient}: "${task.subject}"`,
      totalSteps: steps.length,
      steps,
      createdAt: new Date().toISOString()
    };

    logger.info(`Planned ${steps.length} step(s) for task ${task.id}`, { taskId: task.id, category });
    return plan;
  }

  static createStep({ id, name, tool, params, verificationCriteria, dependsOn = [], expectedOutcome = '', followupSpec = null }) {
    const riskEval = SafetyEngine.classifyActionRisk(tool, params);
    return {
      id,
      name,
      tool,
      params,
      dependsOn,
      expectedOutcome,
      followupSpec,
      riskLevel: riskEval.level,
      requiresApproval: riskEval.requiresApproval,
      riskReason: riskEval.reason,
      verificationCriteria,
      status: 'PENDING'
    };
  }
}
