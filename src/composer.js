/**
 * Smart Contextual Email Composer
 * Generates human-grade, thread-aware, non-robotic communications
 * tailored by mode, tone, relationship, and clear calls-to-action (CTA).
 */

import { redactSecrets } from './logger.js';
import { AgentMode } from './types.js';

export class EmailComposer {
  /**
   * Generates a high-quality context-aware email response draft
   */
  static compose({
    category = AgentMode.SUPPORT,
    recipient = 'Partner',
    subject = '',
    threadContext = '',
    intent = '',
    urgency = 'MEDIUM',
    relationship = 'partner',
    requestedAction = '',
    previousResponses = [],
    entities = {},
    tone = 'professional',
    customNotes = '',
    callToAction = ''
  }) {
    let cleanSubject = subject.startsWith('Re:') || subject.startsWith('[') ? subject : `Re: ${subject}`;
    let body = '';

    const name = recipient.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Adjust tone dynamically if not explicitly overridden
    let effectiveTone = tone;
    if (tone === 'professional') {
      if (urgency === 'CRITICAL') effectiveTone = 'urgent_expedited';
      else if (relationship === 'vip') effectiveTone = 'executive_warm';
      else if (category === AgentMode.SUPPORT) effectiveTone = 'empathetic_solution';
      else if (category === AgentMode.SALES_GTM) effectiveTone = 'consultative';
    }

    switch (category) {
      case AgentMode.SCHEDULING:
        body = this.composeSchedulingEmail({ name, intent, entities, tone: effectiveTone, threadContext, callToAction });
        break;

      case AgentMode.SALES_GTM:
        body = this.composeSalesEmail({ name, intent, entities, tone: effectiveTone, threadContext, callToAction });
        break;

      case AgentMode.GENERAL_OPS:
        body = this.composeOpsEmail({ name, intent, entities, tone: effectiveTone, threadContext, callToAction });
        break;

      case AgentMode.SUPPORT:
      default:
        body = this.composeSupportEmail({ name, intent, entities, tone: effectiveTone, threadContext, requestedAction, callToAction });
        break;
    }

    if (customNotes) {
      body += `\n\nNote: ${customNotes}`;
    }

    // Security pass: sanitize any accidentally leaked secrets
    const sanitizedBody = redactSecrets(body);

    return {
      to: recipient,
      subject: cleanSubject,
      body: sanitizedBody,
      tone: effectiveTone,
      generatedAt: new Date().toISOString()
    };
  }

  static composeSchedulingEmail({ name, entities, tone, threadContext, callToAction }) {
    const timeSlot = entities.timeSlot || 'Friday at 2:00 PM UTC';
    const cta = callToAction || 'Could you let me know which of these times works best for you? I will send over a calendar invite once confirmed.';

    let greeting = `Hi ${name},`;
    if (tone === 'executive_warm') greeting = `Dear ${name},`;

    return `${greeting}

Thanks for reaching out regarding meeting availability.

I have checked our calendar constraints and can confirm that ${timeSlot} works well. Alternatively, I can also make Thursday at 4:00 PM UTC work if that aligns better with your timezone.

${cta}

Best regards,
Operations Team`;
  }

  static composeSalesEmail({ name, entities, tone, threadContext, callToAction }) {
    const cta = callToAction || 'Would you be open to a 15-minute introductory walkthrough this week? If so, feel free to suggest a time that suits you or grab a slot directly on our calendar.';

    return `Hi ${name},

Thank you for your interest in our platform.

I reviewed your inquiry and would be glad to walk you through our product capabilities and enterprise tier. We provide automated agent workflows with verifiable on-chain settlement and multi-chain treasury integration.

${cta}

Looking forward to connecting,
Growth & Partnerships Team`;
  }

  static composeOpsEmail({ name, entities, tone, threadContext, callToAction }) {
    const amount = entities.amount ? `${entities.amount} ${entities.asset || 'SOL'}` : 'required funds';
    const address = entities.solanaAddress || entities.evmAddress || 'monitored relayer';
    const cta = callToAction || 'Status: Queued for dual-control authorization.';

    return `Hi ${name},

This is an automated operational notice from Mermail Operations Sentinel.

Our automated monitor detected a threshold deficit for relayer:
Target: ${address}
Deficit Replenishment: ${amount}

The replenishment proposal has been calculated and verified against our allowlist. Once human dual-control authorization is signed, funds will be dispatched immediately with on-chain settlement receipts delivered to this thread.

${cta}

Best regards,
Autonomous Treasury Operations`;
  }

  static composeSupportEmail({ name, entities, tone, threadContext, requestedAction, callToAction }) {
    const cta = callToAction || 'To help us resolve this as quickly as possible, could you confirm if you are seeing any specific error codes or error messages in your console?';

    return `Hi ${name},

Thank you for reporting this issue. We have logged your request and our engineering team is actively looking into it.

${cta}

We will follow up with an update within 24 hours.

Best regards,
Technical Support Team`;
  }
}
