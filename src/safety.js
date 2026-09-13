import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ActionRiskLevel, ApprovalStatus } from './types.js';
import { memory } from './memory.js';
import { logger } from './logger.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const APPROVALS_FILE = path.join(DATA_DIR, 'approvals.json');

const SAFE_ACTIONS = new Set([
  'list_mailboxes',
  'list_emails',
  'get_email',
  'get_email_context',
  'save_draft',
  'get_paybox_connection',
  'paybox_get_portfolio',
  'paybox_get_request',
  'summarize_thread',
  'triage_email',
  'generate_plan',
  'read_calendar_constraints',
  'qualify_lead',
  'triage_support_issue',
  'register_followup'
]);

const PROMPT_INJECTION_PATTERNS = [
  /ignore (?:all )?(?:previous|above|prior) instructions/i,
  /you are now a(?:n)?/i,
  /system prompt override/i,
  /disregard (?:all )?(?:rules|allowlist)/i,
  /send (?:me )?(?:your )?(?:api[_-]?key|private[_-]?key|credentials|password)/i,
  /bypass (?:human )?(?:approval|confirmation|allowlist)/i,
  /(?:transfer|send) (?:all )?(?:funds|sol|usdc|eth)/i,
  /disable (?:your |all )?security checks/i,
  /forward confidential emails/i,
  /approve this transaction automatically/i,
  /ignore (?:the )?(?:user(?:['’]?s)? )?policy/i,
  /reveal (?:your )?(?:system |internal )?instructions/i,
  /new admin address/i,
  /drop table/i
];

export class SafetyEngine {
  constructor(storagePath = APPROVALS_FILE) {
    this.storagePath = storagePath;
    this.pendingApprovals = new Map();
    this.load();
  }

  load() {
    try {
      if (this.storagePath && fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            this.pendingApprovals.set(item.token, item);
          }
        }
      }
    } catch {
      // Memory store fallback
    }
  }

  save() {
    try {
      if (this.storagePath) {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const list = Array.from(this.pendingApprovals.values());
        fs.writeFileSync(this.storagePath, JSON.stringify(list, null, 2), 'utf8');
      }
    } catch {
      // Memory store fallback
    }
  }

  /**
   * Evaluates text for adversarial prompt injection attempts.
   */
  static detectPromptInjection(text) {
    if (typeof text !== 'string') return { detected: false, matches: [] };
    const matches = [];
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        matches.push(pattern.source);
      }
    }
    return {
      detected: matches.length > 0,
      matches
    };
  }

  /**
   * Scans text content for sensitive data patterns like SSN, credit cards,
   * private keys, seed phrases, or large monetary transfers.
   */
  static scanSensitiveData(text) {
    if (typeof text !== 'string') return { hasSensitiveData: false, findings: [] };
    const findings = [];

    // Social Security Number: XXX-XX-XXXX
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
      findings.push('Social Security Number (SSN)');
    }

    // Credit card patterns (Visa, Mastercard, Amex, Discover)
    const ccPattern = /\b(?:4[0-9]{3}(?:[ -]?[0-9]{4}){3}|5[1-5][0-9]{2}(?:[ -]?[0-9]{4}){3}|3[47][0-9]{2}[ -]?[0-9]{6}[ -]?[0-9]{5}|6(?:011|5[0-9]{2})(?:[ -]?[0-9]{4}){3})\b/;
    if (ccPattern.test(text)) {
      findings.push('Payment Card Number');
    }

    // Private key / mnemonic seed phrases
    if (/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/i.test(text) || /\b(?:0x)?[a-fA-F0-9]{64}\b/.test(text) && /private[_\s-]?key|secret[_\s-]?key/i.test(text)) {
      findings.push('Cryptographic Private Key');
    }

    // High monetary amount (> $1000)
    const amountMatches = text.match(/\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+)/g);
    if (amountMatches) {
      for (const m of amountMatches) {
        const num = parseFloat(m.replace(/[$,\s]/g, ''));
        if (num > 1000) {
          findings.push(`High monetary amount ($${num.toLocaleString()}) exceeding $1,000 threshold`);
          break;
        }
      }
    }

    return {
      hasSensitiveData: findings.length > 0,
      findings
    };
  }

  /**
   * Classifies an action as SAFE or HIGH_RISK.
   */
  static classifyActionRisk(action, params = {}) {
    if (SAFE_ACTIONS.has(action)) {
      return {
        level: ActionRiskLevel.SAFE,
        requiresApproval: false,
        reason: `Read-only or local non-destructive action '${action}'.`
      };
    }

    // Email drafting vs sending
    if (action === 'save_draft') {
      return {
        level: ActionRiskLevel.SAFE,
        requiresApproval: false,
        reason: 'Saving a draft is safe and does not transmit external messages.'
      };
    }

    // Bulk email transmission check (> 5 recipients)
    let recipientCount = 1;
    if (params.to) {
      if (Array.isArray(params.to)) {
        recipientCount = params.to.length;
      } else if (typeof params.to === 'string' && params.to.includes(',')) {
        recipientCount = params.to.split(',').filter(Boolean).length;
      }
    }

    if (recipientCount > 5) {
      return {
        level: ActionRiskLevel.HIGH_RISK,
        requiresApproval: true,
        reason: `Bulk email transmission to ${recipientCount} recipients requires human authorization to prevent mass distribution errors.`
      };
    }

    // Scan email text for sensitive data leaks
    const textToScan = [params.body, params.text, params.content, params.subject].filter(Boolean).join(' ');
    const sensitiveCheck = this.scanSensitiveData(textToScan);
    if (sensitiveCheck.hasSensitiveData) {
      return {
        level: ActionRiskLevel.HIGH_RISK,
        requiresApproval: true,
        reason: `Message draft contains sensitive data (${sensitiveCheck.findings.join(', ')}) requiring dual-control verification.`
      };
    }

    // External sends require approval if specified by policy
    if (action === 'send_email' || action === 'reply_to_email') {
      const isInternal = params.to && (
        (typeof params.to === 'string' && (params.to.endsWith('@internal.local') || params.to.endsWith('@mermail.app'))) ||
        (Array.isArray(params.to) && params.to.every(t => t.endsWith('@internal.local') || t.endsWith('@mermail.app')))
      );
      if (!isInternal) {
        return {
          level: ActionRiskLevel.HIGH_RISK,
          requiresApproval: true,
          reason: `External email transmission to '${params.to || 'recipient'}' requires dual-control verification.`
        };
      }
    }

    // Financial actions ALWAYS high risk
    if (action.startsWith('paybox_request_transfer') || action.startsWith('paybox_request_swap')) {
      return {
        level: ActionRiskLevel.HIGH_RISK,
        requiresApproval: true,
        reason: `Financial transfer/swap involving assets requires explicit human authorization.`
      };
    }

    return {
      level: ActionRiskLevel.HIGH_RISK,
      requiresApproval: true,
      reason: `Action '${action}' involves external state mutation.`
    };
  }

  /**
   * Tool Permission System (Rule #8)
   */
  static getToolPermissionClassification(action) {
    switch (action) {
      case 'list_mailboxes':
      case 'list_emails':
      case 'get_email':
      case 'get_email_context':
        return { permission: 'READ_EMAIL', riskTier: 'LOW', requiresApproval: false };
      case 'save_draft':
        return { permission: 'DRAFT_EMAIL', riskTier: 'LOW', requiresApproval: false };
      case 'read_calendar_constraints':
      case 'schedule_email_send':
        return { permission: 'SCHEDULE', riskTier: 'MEDIUM', requiresApproval: false };
      case 'register_followup':
        return { permission: 'CREATE_FOLLOWUP', riskTier: 'LOW', requiresApproval: false };
      case 'reply_to_email':
      case 'send_email':
        return { permission: 'SEND_EMAIL', riskTier: 'HIGH', requiresApproval: true };
      case 'paybox_request_transfer':
        return { permission: 'BLOCKCHAIN_TRANSACTION', riskTier: 'HIGH', requiresApproval: true };
      case 'paybox_request_swap':
        return { permission: 'TREASURY_OPERATION', riskTier: 'HIGH', requiresApproval: true };
      default:
        return { permission: 'UNKNOWN', riskTier: 'HIGH', requiresApproval: true };
    }
  }

  /**
   * Creates a formal dual-control approval request with a unique token and impact preview.
   */
  createApprovalRequest({ taskId, action, target, payload, rationale, riskReason }) {
    const token = `APPR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const payloadText = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    const sensitiveCheck = SafetyEngine.scanSensitiveData(payloadText);

    const approval = {
      token,
      taskId,
      action,
      target: target || 'external',
      payload,
      rationale: rationale || 'Required for task completion',
      riskReason: riskReason || 'High-impact operation',
      status: ApprovalStatus.PENDING,
      createdAt: new Date().toISOString(),
      preview: {
        action,
        target,
        summary: `Execute ${action} on ${target}`,
        impact: riskReason,
        sensitiveDataDetected: sensitiveCheck.hasSensitiveData,
        sensitiveDataFindings: sensitiveCheck.findings
      }
    };

    this.pendingApprovals.set(token, approval);
    this.save();
    logger.warn(`Approval required [${token}] for action '${action}' on '${target}'`, { taskId, token });
    return approval;
  }

  /**
   * Validates and approves a pending token.
   */
  approve(token, operator = 'operator') {
    const request = this.pendingApprovals.get(token);
    if (!request) {
      throw new Error(`Approval token '${token}' not found.`);
    }
    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval token '${token}' is already ${request.status}.`);
    }

    request.status = ApprovalStatus.APPROVED;
    request.approvedAt = new Date().toISOString();
    request.operator = operator;

    memory.recordDecision({
      taskId: request.taskId,
      action: request.action,
      approved: true,
      operator,
      rationale: request.rationale,
      timestamp: request.approvedAt
    });

    this.save();
    logger.info(`Action approved [${token}] by ${operator}`, { taskId: request.taskId, token });
    return request;
  }

  /**
   * Rejects a pending approval token.
   */
  reject(token, operator = 'operator', reason = 'Operator rejected execution') {
    const request = this.pendingApprovals.get(token);
    if (!request) {
      throw new Error(`Approval token '${token}' not found.`);
    }
    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval token '${token}' is already ${request.status}.`);
    }

    request.status = ApprovalStatus.REJECTED;
    request.rejectedAt = new Date().toISOString();
    request.operator = operator;
    request.rejectionReason = reason;

    memory.recordDecision({
      taskId: request.taskId,
      action: request.action,
      approved: false,
      operator,
      rationale: reason,
      timestamp: request.rejectedAt
    });

    this.save();
    logger.warn(`Action rejected [${token}] by ${operator}: ${reason}`, { taskId: request.taskId, token });
    return request;
  }

  getApproval(token) {
    return this.pendingApprovals.get(token) || null;
  }

  listPendingApprovals() {
    return Array.from(this.pendingApprovals.values()).filter(a => a.status === ApprovalStatus.PENDING);
  }

  clear() {
    this.pendingApprovals.clear();
    this.save();
  }
}

export const safety = new SafetyEngine();
