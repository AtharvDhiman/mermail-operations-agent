/**
 * Idempotency & Replay Protection Engine
 * Prevents duplicate email dispatches, redundant transactions, and re-executed steps.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const IDEMPOTENCY_FILE = path.join(DATA_DIR, 'idempotency.json');

export class IdempotencyGuard {
  constructor(storagePath = IDEMPOTENCY_FILE) {
    this.storagePath = storagePath;
    this.executedKeys = new Map();
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const json = JSON.parse(raw);
        for (const [k, v] of Object.entries(json)) {
          this.executedKeys.set(k, v);
        }
      } else {
        this.save();
      }
    } catch (err) {
      logger.warn(`Failed to initialize idempotency cache from disk: ${err.message}`);
    }
  }

  save() {
    try {
      const obj = Object.fromEntries(this.executedKeys);
      fs.writeFileSync(this.storagePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      logger.error(`Failed to save idempotency cache: ${err.message}`);
    }
  }

  /**
   * Generates a deterministic SHA-256 key for a specific action
   */
  generateKey({ taskId, stepId, action, target = '', payload = {} }) {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const raw = `${taskId}:${stepId}:${action}:${target}:${payloadStr}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Generates a deterministic SHA-256 fingerprint for an inbound email
   */
  generateMessageKey({ from = '', subject = '', body = '' }) {
    const bodyStr = typeof body === 'object' ? (body.text || body.content || '') : String(body);
    const normalized = `${from.toLowerCase().trim()}:${subject.toLowerCase().trim()}:${bodyStr.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Checks if an action has already been executed
   */
  hasExecuted(key) {
    return this.executedKeys.has(key);
  }

  /**
   * Checks if an incoming message was already ingested
   */
  hasProcessedMessage(msgKey) {
    return this.executedKeys.has(`msg:${msgKey}`);
  }

  /**
   * Records execution of an action
   */
  recordExecution(key, result = {}) {
    const record = {
      key,
      executedAt: new Date().toISOString(),
      result
    };
    this.executedKeys.set(key, record);
    this.save();
    return record;
  }

  /**
   * Records an ingested message fingerprint
   */
  recordMessage(msgKey, taskId) {
    const record = {
      key: `msg:${msgKey}`,
      taskId,
      ingestedAt: new Date().toISOString()
    };
    this.executedKeys.set(`msg:${msgKey}`, record);
    this.save();
    return record;
  }

  /**
   * In-flight concurrency lock to prevent duplicate parallel execution
   */
  acquireLock(key) {
    if (!this.inFlightLocks) this.inFlightLocks = new Set();
    if (this.inFlightLocks.has(key)) {
      return false; // Lock already held
    }
    this.inFlightLocks.add(key);
    return true;
  }

  releaseLock(key) {
    if (!this.inFlightLocks) this.inFlightLocks = new Set();
    this.inFlightLocks.delete(key);
  }

  getExecution(key) {
    return this.executedKeys.get(key) || null;
  }

  clear() {
    this.executedKeys.clear();
    if (this.inFlightLocks) this.inFlightLocks.clear();
    this.save();
  }
}

export const idempotency = new IdempotencyGuard();
