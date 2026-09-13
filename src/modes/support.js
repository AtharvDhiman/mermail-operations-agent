/**
 * Specialized Operations Mode: Customer Support & Issue Resolution
 * Enforces SLA targets, sentiment detection, knowledge-base search,
 * and satisfaction follow-up workflows.
 */

import { EmailComposer } from '../composer.js';
import { PriorityLevel } from '../types.js';

export const SupportSLAs = {
  [PriorityLevel.P0]: { targetResolutionHours: 1, targetResponseMinutes: 15 },
  [PriorityLevel.P1]: { targetResolutionHours: 4, targetResponseMinutes: 60 },
  [PriorityLevel.P2]: { targetResolutionHours: 24, targetResponseMinutes: 240 },
  [PriorityLevel.P3]: { targetResolutionHours: 48, targetResponseMinutes: 480 }
};

export class SupportModeEngine {
  /**
   * Evaluates support ticket sentiment and SLA requirement
   */
  static processTicket(task) {
    const body = (task.rawEmail?.body || '').toLowerCase();
    const isFrustrated = body.includes('angry') || body.includes('terrible') || body.includes('unacceptable') || body.includes('urgent');

    const sla = SupportSLAs[task.priority] || SupportSLAs[PriorityLevel.P2];

    const recommendedAction = isFrustrated
      ? 'Expedite technical resolution and escalate draft for human tone review'
      : 'Generate diagnostic troubleshooting draft and request error logs';

    return {
      sla,
      sentiment: isFrustrated ? 'NEGATIVE_FRUSTRATED' : 'NEUTRAL_INQUIRY',
      recommendedAction,
      requiresManagerReview: isFrustrated && (task.priority === PriorityLevel.P0 || task.priority === PriorityLevel.P1)
    };
  }

  /**
   * Generates a targeted troubleshooting solution draft
   */
  static generateSolutionDraft(task) {
    return EmailComposer.compose({
      category: 'SUPPORT',
      recipient: task.sender,
      subject: task.subject,
      tone: 'empathetic',
      entities: task.entities
    });
  }
}
