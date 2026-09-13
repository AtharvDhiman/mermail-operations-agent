/**
 * Structured Logger with Secret Redaction and Observability
 * Supports DEBUG, INFO, WARN, ERROR, SECURITY, AUDIT
 */

import { LogLevel } from './types.js';

const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /mermail_[a-zA-Z0-9_-]{16,}/g,
  /bearer\s+[a-zA-Z0-9_.-]+/gi,
  /0x[a-fA-F0-9]{64}/g, // 32-byte private key hex
  /[1-9A-HJ-NP-za-km-z]{64,88}/g // base58 private key candidates
];

export function redactSecrets(text) {
  if (typeof text !== 'string') {
    try {
      text = JSON.stringify(text);
    } catch {
      return text;
    }
  }
  let redacted = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED_SECRET]');
  }
  return redacted;
}

class Logger {
  constructor() {
    this.minLevel = process.env.LOG_LEVEL || LogLevel.INFO;
    this.levelWeights = {
      [LogLevel.DEBUG]: 10,
      [LogLevel.INFO]: 20,
      [LogLevel.AUDIT]: 25,
      [LogLevel.WARN]: 30,
      [LogLevel.ERROR]: 40,
      [LogLevel.SECURITY]: 50
    };
  }

  shouldLog(level) {
    const currentWeight = this.levelWeights[this.minLevel] || 20;
    const msgWeight = this.levelWeights[level] || 20;
    return msgWeight >= currentWeight;
  }

  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const taskId = context.taskId || context.task_id || '-';
    const correlationId = context.correlationId || context.traceId || '-';

    const sanitizedMessage = redactSecrets(message);
    const sanitizedContext = JSON.parse(redactSecrets(JSON.stringify(context)));

    return {
      timestamp,
      level,
      taskId,
      correlationId,
      message: sanitizedMessage,
      context: sanitizedContext
    };
  }

  log(level, message, context = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatMessage(level, message, context);

    if (process.env.LOG_FORMAT === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      const prefix = `[${logEntry.timestamp}] [${level.padEnd(8)}]`;
      const taskTag = logEntry.taskId !== '-' ? ` [${logEntry.taskId}]` : '';
      console.log(`${prefix}${taskTag} ${logEntry.message}`);
      if (Object.keys(context).length > 0 && context.error) {
        console.error(context.error);
      }
    }
  }

  debug(msg, ctx) { this.log(LogLevel.DEBUG, msg, ctx); }
  info(msg, ctx) { this.log(LogLevel.INFO, msg, ctx); }
  audit(msg, ctx) { this.log(LogLevel.AUDIT, msg, ctx); }
  warn(msg, ctx) { this.log(LogLevel.WARN, msg, ctx); }
  error(msg, ctx) { this.log(LogLevel.ERROR, msg, ctx); }
  security(msg, ctx) { this.log(LogLevel.SECURITY, msg, ctx); }
}

export const logger = new Logger();
