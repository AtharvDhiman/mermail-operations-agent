/**
 * Immutable Audit Trail Logger
 * Persists append-only chronological logs of every agent action, tool call,
 * approval decision, and system mutation.
 */

import fs from 'fs';
import path from 'path';
import { redactSecrets, logger } from './logger.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_log.jsonl');

export class AuditTrail {
  constructor(storagePath = AUDIT_FILE) {
    this.storagePath = storagePath;
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      logger.warn(`Failed to initialize audit directory: ${err.message}`);
    }
  }

  /**
   * Appends an audit event to the persistent log
   */
  record({
    taskId = '-',
    threadId = '-',
    action,
    tool = '-',
    status = 'SUCCESS',
    actor = 'AGENT:AUTONOMOUS',
    details = {},
    error = null
  }) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      taskId,
      threadId,
      action,
      tool,
      status,
      actor,
      details: JSON.parse(redactSecrets(JSON.stringify(details))),
      error: error ? redactSecrets(String(error)) : null
    };

    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.storagePath, line, 'utf8');
      logger.audit(`[AUDIT] ${taskId} | ${action} | ${status} by ${actor}`, { taskId });
    } catch (err) {
      logger.error(`Failed to write to audit log: ${err.message}`);
    }

    return entry;
  }

  /**
   * Retrieves recent audit log entries
   */
  getRecentLogs(limit = 50) {
    try {
      if (!fs.existsSync(this.storagePath)) return [];
      const content = fs.readFileSync(this.storagePath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      return lines.slice(-limit).map(l => {
        try { return JSON.parse(l); } catch { return null; }
      }).filter(Boolean).reverse();
    } catch (err) {
      logger.error(`Failed to read audit logs: ${err.message}`);
      return [];
    }
  }

  /**
   * Retrieves audit logs for a specific task
   */
  getTaskLogs(taskId) {
    const all = this.getRecentLogs(1000);
    return all.filter(entry => entry.taskId === taskId);
  }

  /**
   * Queries audit logs with multidimensional filters (taskId, action, tool, status, actor)
   */
  queryLogs({ taskId, action, tool, status, actor, limit = 50 } = {}) {
    const all = this.getRecentLogs(1000);
    return all.filter(entry => {
      if (taskId && entry.taskId !== taskId) return false;
      if (action && !entry.action?.toLowerCase().includes(action.toLowerCase())) return false;
      if (tool && entry.tool !== tool) return false;
      if (status && entry.status !== status) return false;
      if (actor && !entry.actor?.toLowerCase().includes(actor.toLowerCase())) return false;
      return true;
    }).slice(0, limit);
  }

  clear() {
    try {
      if (fs.existsSync(this.storagePath)) {
        fs.unlinkSync(this.storagePath);
      }
    } catch (err) {
      logger.warn(`Failed to clear audit log: ${err.message}`);
    }
  }
}

export const audit = new AuditTrail();
