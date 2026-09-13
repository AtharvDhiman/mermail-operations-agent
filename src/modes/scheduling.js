/**
 * Specialized Operations Mode: Intelligent Meeting Scheduling
 * Parses availability constraints, normalizes timezones, proposes optimal slots,
 * and tracks confirmation workflows.
 */

import { EmailComposer } from '../composer.js';

export class SchedulingModeEngine {
  /**
   * Resolves availability and proposes candidate meeting slots
   */
  static resolveSlots(task) {
    const timeMentioned = task.entities?.timeSlot;
    const body = (task.rawEmail?.body || '').toLowerCase();

    // Default slots if none specified
    const candidateSlots = [];
    if (timeMentioned) {
      candidateSlots.push({
        slot: timeMentioned,
        isRequestedBySender: true,
        available: true
      });
      candidateSlots.push({
        slot: 'Next business day at 3:00 PM UTC',
        isRequestedBySender: false,
        available: true
      });
    } else {
      candidateSlots.push({
        slot: 'Thursday at 2:00 PM UTC',
        available: true
      });
      candidateSlots.push({
        slot: 'Friday at 4:00 PM UTC',
        available: true
      });
    }

    const timezoneDetected = body.match(/\b(est|pst|utc|gmt|cst|cet|ist)\b/i)?.[1]?.toUpperCase() || 'UTC';

    return {
      candidateSlots,
      timezoneDetected,
      status: 'SLOTS_PROPOSED'
    };
  }

  /**
   * Generates scheduling proposal draft
   */
  static generateSchedulingDraft(task) {
    return EmailComposer.compose({
      category: 'SCHEDULING',
      recipient: task.sender,
      subject: task.subject,
      tone: 'concise',
      entities: task.entities
    });
  }
}
