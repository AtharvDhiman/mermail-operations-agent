/**
 * Intelligent Inbox Triage & Classification Engine
 * Analyzes incoming messages, categorizes intent into 4 specialized modes,
 * evaluates urgency and priority, extracts deadlines & entities, and builds structured tasks.
 */

import { AgentMode, UrgencyLevel, PriorityLevel, WorkflowState } from './types.js';
import { calculateConfidence } from './confidence.js';
import { memory } from './memory.js';
import { logger } from './logger.js';

export class InboxTriage {
  /**
   * Evaluates an email message and produces a structured operational task
   */
  static triageEmail(email) {
    const emailId = email.id || `msg_${Date.now()}`;
    const threadId = email.thread_id || email.threadId || emailId;
    const sender = email.from || email.sender || 'unknown@domain.com';
    const subject = email.subject || '';
    const rawBody = email.body || email.content || email.text || '';
    const body = typeof rawBody === 'object' ? (rawBody.text || rawBody.content || rawBody.html || '') : String(rawBody);
    const content = `${subject}\n${body}`.toLowerCase();

    // 1. Detect Category & Mode
    const { category, intent, keywords, isNoAction } = this.detectCategoryAndIntent(content, subject);

    // 2. Detect Urgency & Priority
    const { urgency, priority } = this.detectUrgencyAndPriority(content, sender, isNoAction);

    // 3. Extract Entities, Deadlines, Questions & Requests
    const entities = this.extractEntities(email);
    const deadlines = this.extractDeadlines(content);
    const questions = this.extractQuestions(body || subject);
    const requests = this.extractRequests(body || subject);

    // 4. Determine Action Requirements
    const requiredActions = this.determineRequiredActions({
      category,
      urgency,
      content,
      entities,
      isNoAction,
      hasQuestionsOrRequests: questions.length > 0 || requests.length > 0
    });

    // 5. Compute Confidence
    const confidence = calculateConfidence({
      intent,
      intentKeywords: keywords,
      entitiesFound: Object.keys(entities),
      entitiesRequired: this.getRequiredEntitiesForCategory(category),
      ambiguityFlags: this.getAmbiguityFlags(content, category)
    });

    // 6. Update Contact History in Memory
    memory.updateContact(sender, {
      lastCategory: category,
      lastSubject: subject
    });

    const taskId = `TASK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const task = {
      id: taskId,
      emailId,
      threadId,
      sender,
      subject,
      category,
      intent,
      urgency,
      priority,
      confidence,
      requiredActions,
      requiresAction: !isNoAction,
      entities,
      deadlines,
      questions,
      requests,
      isNoAction,
      state: WorkflowState.CLASSIFIED,
      createdAt: new Date().toISOString(),
      rawEmail: {
        id: emailId,
        from: sender,
        subject,
        body
      }
    };

    logger.info(`Triaged email "${subject}" -> ${category} (${priority})`, { taskId, category, urgency });
    return task;
  }

  static detectCategoryAndIntent(content, subject) {
    const subjectLower = subject.toLowerCase();

    // Check SALES_GTM (pricing, enterprise, demo inquiry, partnership)
    if (
      subjectLower.includes('pricing') ||
      subjectLower.includes('enterprise') ||
      content.includes('pricing') ||
      content.includes('schedule a demo') ||
      content.includes('interested in') ||
      content.includes('quote') ||
      content.includes('partnership proposal') ||
      content.includes('enterprise tier')
    ) {
      return {
        category: AgentMode.SALES_GTM,
        intent: 'Inbound Sales Lead / Partnership Inquiry',
        keywords: ['pricing', 'demo', 'partnership', 'interested', 'quote'].filter(k => content.includes(k))
      };
    }

    const isMeetingRequest = content.includes('meeting') ||
      content.includes('reschedule') ||
      (content.includes('schedule') && !content.includes('schedule_email')) ||
      content.includes('walkthrough') ||
      content.includes('calendar') ||
      content.includes('call at') ||
      content.includes('zoom');

    // Check SCHEDULING if meeting/reschedule is explicitly requested
    if (isMeetingRequest) {
      const isReschedule = content.includes('reschedule') || content.includes('move');
      return {
        category: AgentMode.SCHEDULING,
        intent: isReschedule ? 'Reschedule Meeting' : 'Schedule Meeting',
        keywords: ['meeting', 'schedule', 'available', 'walkthrough'].filter(k => content.includes(k))
      };
    }

    // Check GENERAL_OPS (Web3 alerts, relayer, gas, paymaster, balance deficit)
    if (
      content.includes('low balance') ||
      content.includes('gas starvation') ||
      content.includes('relayer') ||
      content.includes('paymaster') ||
      (content.includes('treasury') && (content.includes('deficit') || content.includes('rebalance') || content.includes('transfer') || content.includes('balance'))) ||
      content.includes('top up') ||
      content.includes('billing alert') ||
      content.includes('rpc endpoint') ||
      content.includes('server outage')
    ) {
      return {
        category: AgentMode.GENERAL_OPS,
        intent: 'Infrastructure or Treasury Operation',
        keywords: ['relayer', 'balance', 'treasury', 'alert', 'top up'].filter(k => content.includes(k))
      };
    }

    // Check SALES_GTM
    if (
      content.includes('pricing') ||
      content.includes('demo') ||
      content.includes('partnership') ||
      content.includes('lead') ||
      content.includes('interested in') ||
      content.includes('quote') ||
      content.includes('enterprise plan') ||
      content.includes('sponsor')
    ) {
      return {
        category: AgentMode.SALES_GTM,
        intent: 'Inbound Sales Lead / Partnership Inquiry',
        keywords: ['pricing', 'demo', 'partnership', 'interested', 'quote'].filter(k => content.includes(k))
      };
    }

    // Check SUPPORT
    if (
      content.includes('bug') ||
      content.includes('error') ||
      content.includes('broken') ||
      content.includes('issue') ||
      content.includes('help') ||
      content.includes('failed') ||
      content.includes('not working') ||
      content.includes('support ticket')
    ) {
      return {
        category: AgentMode.SUPPORT,
        intent: 'Customer Support Request / Issue',
        keywords: ['bug', 'error', 'broken', 'issue', 'help'].filter(k => content.includes(k))
      };
    }

    // Check for Informational / Newsletter / No Action emails
    const isNewsletter = content.includes('unsubscribe') ||
      content.includes('weekly digest') ||
      content.includes('newsletter') ||
      ((content.includes('no-reply') || content.includes('noreply')) && !content.includes('alert')) ||
      content.includes('this is an automated notification, please do not reply');

    if (isNewsletter) {
      return {
        category: AgentMode.SUPPORT,
        intent: 'Automated Newsletter / Digest',
        keywords: ['newsletter', 'digest'],
        isNoAction: true
      };
    }

    // Default to SUPPORT inquiry or general communication
    return {
      category: AgentMode.SUPPORT,
      intent: 'General Inquiry',
      keywords: ['inquiry'],
      isNoAction: false
    };
  }

  static detectUrgencyAndPriority(content, sender, isNoAction = false) {
    if (isNoAction) {
      return { urgency: UrgencyLevel.LOW, priority: PriorityLevel.P4 };
    }

    let urgency = UrgencyLevel.LOW;
    let priority = PriorityLevel.P3;

    // Critical triggers
    if (
      content.includes('urgent') ||
      content.includes('asap') ||
      content.includes('critical') ||
      content.includes('outage') ||
      content.includes('production down') ||
      content.includes('gas starvation') ||
      content.includes('emergency')
    ) {
      urgency = UrgencyLevel.CRITICAL;
      priority = PriorityLevel.P0;
    } else if (
      content.includes('today') ||
      content.includes('deadline') ||
      content.includes('important') ||
      content.includes('immediately') ||
      content.includes('by eod')
    ) {
      urgency = UrgencyLevel.HIGH;
      priority = PriorityLevel.P1;
    } else if (
      content.includes('tomorrow') ||
      content.includes('this week') ||
      content.includes('meeting')
    ) {
      urgency = UrgencyLevel.MEDIUM;
      priority = PriorityLevel.P2;
    }

    // Check VIP sender status in memory
    const contact = memory.getContact(sender);
    if (contact && contact.vip) {
      if (priority === PriorityLevel.P3) priority = PriorityLevel.P2;
      if (priority === PriorityLevel.P2) priority = PriorityLevel.P1;
    }

    return { urgency, priority };
  }

  static extractEntities(email) {
    const rawBody = email.body || email.content || '';
    const bodyText = typeof rawBody === 'object' ? (rawBody.text || rawBody.content || '') : String(rawBody);
    const text = `${email.subject || ''} ${bodyText}`;
    const entities = {};

    // Wallet address (Solana Base58 or EVM 0x)
    const solanaMatch = text.match(/\b[1-9A-HJ-NP-za-km-z]{32,44}\b/);
    if (solanaMatch && !text.includes('http')) {
      entities.solanaAddress = solanaMatch[0];
    }
    const evmMatch = text.match(/\b0x[a-fA-F0-9]{40}\b/);
    if (evmMatch) {
      entities.evmAddress = evmMatch[0];
    }

    // Amounts / Numbers
    const amountMatch = text.match(/(?:amount|balance|deficit|threshold|quote|price|transfer|swap)[:\s]+([\d.]+)\s*(SOL|ETH|USDC|\$)/i);
    if (amountMatch) {
      entities.amount = parseFloat(amountMatch[1]);
      entities.asset = amountMatch[2].toUpperCase();
    }

    // Time/Date mentions
    const timeMatch = text.match(/\b(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    if (timeMatch) {
      entities.timeSlot = timeMatch[1];
    }

    return entities;
  }

  static extractQuestions(text) {
    if (typeof text !== 'string') return [];
    const questions = [];
    const qMatches = text.match(/[^.!?\n]+(?:\?+)/g);
    if (qMatches) {
      for (const q of qMatches) {
        const trimmed = q.trim();
        if (trimmed.length > 5) {
          questions.push(trimmed);
        }
      }
    }
    const interrogativePatterns = [
      /(?:could you|can we|can you|would you|is it possible to|what is|how do we|are you available)\s+[^.!?\n]+/gi
    ];
    for (const pat of interrogativePatterns) {
      let m;
      while ((m = pat.exec(text)) !== null) {
        const matchStr = m[0].trim();
        if (!questions.some(q => q.includes(matchStr))) {
          questions.push(matchStr);
        }
      }
    }
    return questions;
  }

  static extractRequests(text) {
    if (typeof text !== 'string') return [];
    const requests = [];
    const requestPatterns = [
      /(?:please|kindly|could you|can you|make sure to)\s+([^.!?\n]+)/gi,
      /(?:reschedule|move|schedule|confirm|send|provide|review|follow up with)\s+([^.!?\n]+)/gi
    ];
    for (const pat of requestPatterns) {
      let m;
      while ((m = pat.exec(text)) !== null) {
        requests.push(m[0].trim());
      }
    }
    return requests;
  }

  static isNoAction(email) {
    const rawBody = email.body || email.content || email.text || '';
    const body = typeof rawBody === 'object' ? (rawBody.text || rawBody.content || '') : String(rawBody);
    const subject = email.subject || '';
    const content = `${subject}\n${body}`.toLowerCase();
    const { isNoAction } = this.detectCategoryAndIntent(content, subject);
    return Boolean(isNoAction);
  }

  static extractDeadlines(content) {
    const deadlines = [];
    const patterns = [
      /(?:by|before|until|deadline[:\s]*)\s+(?:next\s+)?(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{4}-\d{2}-\d{2})/gi,
      /(?:in\s+)(\d+\s+(?:hours?|days?|weeks?|minutes?))/gi,
      /(?:by eod|end of day|end of week)/gi,
      /(?:next\s+(?:tuesday|monday|wednesday|thursday|friday|week))/gi
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(content)) !== null) {
        const val = m[0].trim();
        if (!deadlines.includes(val)) {
          deadlines.push(val);
        }
      }
    }
    return deadlines;
  }

  static determineRequiredActions({ category, urgency, content, entities, isNoAction, hasQuestionsOrRequests }) {
    if (isNoAction) {
      return {
        immediate_action: false,
        reply_required: false,
        scheduling_required: false,
        approval_required: false,
        human_approval: false,
        escalation_required: false,
        no_action: true
      };
    }

    const actions = {
      immediate_action: urgency === UrgencyLevel.CRITICAL,
      reply_required: hasQuestionsOrRequests !== undefined ? hasQuestionsOrRequests : true,
      scheduling_required: category === AgentMode.SCHEDULING,
      approval_required: false,
      human_approval: false,
      escalation_required: false,
      no_action: false
    };

    // If financial transfer, high-risk or external commitment, mark approval_required
    if (category === AgentMode.GENERAL_OPS && (entities.amount || content.includes('transfer') || content.includes('top up'))) {
      actions.approval_required = true;
      actions.human_approval = true;
    }

    // External commitments or sensitive operations
    if (content.includes('transfer') || content.includes('wire') || content.includes('pay ') || content.includes('refund')) {
      actions.approval_required = true;
      actions.human_approval = true;
    }

    // If critical urgency with ambiguous goal, flag for escalation
    if (urgency === UrgencyLevel.CRITICAL && content.length < 30) {
      actions.escalation_required = true;
    }

    return actions;
  }

  static getRequiredEntitiesForCategory(category) {
    switch (category) {
      case AgentMode.SCHEDULING:
        return ['timeSlot'];
      case AgentMode.GENERAL_OPS:
        return ['amount', 'asset'];
      default:
        return [];
    }
  }

  static getAmbiguityFlags(content, category) {
    const flags = [];
    if (content.length < 20) flags.push('very_brief_message');
    if (category === AgentMode.SCHEDULING && !content.match(/\d/)) flags.push('no_specific_time_mentioned');
    return flags;
  }
}
