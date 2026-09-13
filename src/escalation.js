/**
 * Smart Escalation Engine
 * Formats standardized 4-part executive briefs for operator intervention:
 * 1. WHAT HAPPENED
 * 2. WHY IT WAS ESCALATED
 * 3. WHAT HAS ALREADY BEEN DONE
 * 4. WHAT DECISION IS REQUIRED
 */

import { logger } from './logger.js';

export class EscalationEngine {
  /**
   * Generates a 4-part structured executive escalation brief
   */
  static buildEscalationReport({
    taskId,
    subject = '',
    sender = '',
    reason = '',
    severity = 'HIGH',
    completedSteps = [],
    pendingAction = '',
    suggestedOptions = []
  }) {
    const timestamp = new Date().toISOString();

    const whatHappened = `Incoming communication from "${sender}" with subject "${subject}". The autonomous agent processed the request through triage and initial execution steps.`;

    const whyEscalated = reason || 'Agent confidence fell below autonomous execution threshold or a high-risk policy gate requires operator discretion.';

    const stepsDone = completedSteps.length > 0
      ? completedSteps.map((s, i) => `  ${i + 1}. [${s.status || 'DONE'}] ${s.name || s.tool}`).join('\n')
      : '  1. Inbound email received and triaged.\n  2. Risk evaluation completed.';

    const whatDecision = pendingAction || (
      suggestedOptions.length > 0
        ? `Operator review required. Options:\n${suggestedOptions.map((opt, i) => `  [Option ${i + 1}] ${opt}`).join('\n')}`
        : 'Please review the action details and grant or decline approval via the CLI or Dashboard.'
    );

    const formattedBrief = `
================================================================================
[EXECUTIVE ESCALATION BRIEF] - Severity: ${severity.toUpperCase()}
Timestamp: ${timestamp} | Task ID: ${taskId}
================================================================================

1. WHAT HAPPENED:
${whatHappened}

2. WHY IT WAS ESCALATED:
${whyEscalated}

3. WHAT HAS ALREADY BEEN DONE:
${stepsDone}

4. WHAT DECISION IS REQUIRED:
${whatDecision}
================================================================================
`.trim();

    logger.warn(`Escalation triggered for task ${taskId}: ${whyEscalated}`, { taskId, severity });

    return {
      taskId,
      timestamp,
      severity,
      whatHappened,
      whyEscalated,
      whatHasBeenDone: stepsDone,
      whatDecisionRequired: whatDecision,
      formattedBrief
    };
  }
}
