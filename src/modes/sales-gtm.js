/**
 * Specialized Operations Mode: Sales & Go-To-Market (GTM)
 * Handles inbound lead qualification, ICP scoring, tailored outreach drafting,
 * and persistent multi-day sales cadences.
 */

import { EmailComposer } from '../composer.js';

export class SalesGtmModeEngine {
  /**
   * Qualifies an inbound sales inquiry and computes an ICP fit score
   */
  static qualifyLead(task) {
    const sender = task.sender || '';
    const body = (task.rawEmail?.body || '').toLowerCase();
    const domain = sender.split('@')[1] || '';

    let score = 40; // Base score
    const highlights = [];

    // Corporate domain check
    const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'proton.me'];
    if (!freeDomains.includes(domain)) {
      score += 25;
      highlights.push(`Corporate business domain (@${domain})`);
    }

    // Enterprise / scale indicators
    if (body.includes('enterprise') || body.includes('team') || body.includes('scale') || body.includes('production')) {
      score += 20;
      highlights.push('Mentions enterprise scale or team deployment');
    }

    // Budget / Pricing indicators
    if (body.includes('pricing') || body.includes('budget') || body.includes('procurement') || body.includes('annual')) {
      score += 15;
      highlights.push('Explicit pricing or procurement inquiry');
    }

    score = Math.min(100, score);
    const tier = score >= 80 ? 'TIER_1_HIGH_VALUE' : score >= 60 ? 'TIER_2_QUALIFIED' : 'TIER_3_INQUIRY';

    return {
      score,
      tier,
      highlights,
      recommendedFollowupDays: tier === 'TIER_1_HIGH_VALUE' ? 2 : 3
    };
  }

  /**
   * Generates tailored sales outreach response
   */
  static generateSalesDraft(task) {
    return EmailComposer.compose({
      category: 'SALES_GTM',
      recipient: task.sender,
      subject: task.subject,
      tone: 'professional',
      entities: task.entities
    });
  }
}
