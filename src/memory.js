/**
 * Conversation Memory & Context Management
 * Manages persistent structured task state, entity cache, contact preferences,
 * and historical decisions. Strictly enforces a zero-secrets storage policy.
 */

import fs from 'fs';
import path from 'path';
import { redactSecrets, logger } from './logger.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');

export class ConversationMemory {
  constructor(storagePath = MEMORY_FILE) {
    this.storagePath = storagePath;
    this.data = {
      contacts: {},
      tasks: {},
      entities: {},
      decisions: []
    };
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8').trim();
        if (raw) {
          this.data = JSON.parse(raw);
        }
      } else {
        this.save();
      }
    } catch (err) {
      logger.warn(`Failed to initialize memory from disk, using in-memory store: ${err.message}`);
    }
  }

  save() {
    try {
      // Ensure no secrets leaked before saving
      const sanitized = JSON.parse(redactSecrets(JSON.stringify(this.data)));
      const jsonStr = JSON.stringify(sanitized, null, 2);
      const tmpFile = `${this.storagePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpFile, jsonStr, 'utf8');
      try {
        fs.renameSync(tmpFile, this.storagePath);
      } catch {
        // Fallback for Windows file lock collisions
        fs.writeFileSync(this.storagePath, jsonStr, 'utf8');
        try { fs.unlinkSync(tmpFile); } catch {}
      }
    } catch (err) {
      logger.error(`Failed to persist memory to ${this.storagePath}: ${err.message}`);
    }
  }

  // --- Contact Preferences & Context ---
  getContact(email) {
    if (!email) return null;
    return this.data.contacts[email.toLowerCase()] || null;
  }

  updateContact(email, updateData) {
    if (!email) return;
    const key = email.toLowerCase();
    const current = this.data.contacts[key] || {
      email: key,
      firstSeen: new Date().toISOString(),
      interactionCount: 0,
      preferences: {},
      notes: []
    };

    this.data.contacts[key] = {
      ...current,
      ...updateData,
      interactionCount: current.interactionCount + 1,
      lastSeen: new Date().toISOString()
    };
    this.save();
    return this.data.contacts[key];
  }

  // --- Task State Management ---
  saveTask(taskId, taskState) {
    if (!taskId) return;
    this.data.tasks[taskId] = {
      ...taskState,
      updatedAt: new Date().toISOString()
    };
    this.save();
  }

  getTask(taskId) {
    return this.data.tasks[taskId] || null;
  }

  listActiveTasks() {
    return Object.values(this.data.tasks).filter(t => 
      !['COMPLETED', 'FAILED'].includes(t.state)
    );
  }

  // --- Entity Management ---
  setEntity(key, entityData) {
    this.data.entities[key] = {
      ...entityData,
      updatedAt: new Date().toISOString()
    };
    this.save();
  }

  getEntity(key) {
    return this.data.entities[key] || null;
  }

  // --- Decision Auditing ---
  recordDecision({ taskId, action, approved, operator, rationale, timestamp }) {
    this.data.decisions.push({
      taskId,
      action,
      approved,
      operator: operator || 'operator',
      rationale: rationale || 'Explicit human decision',
      timestamp: timestamp || new Date().toISOString()
    });
    this.save();
  }

  getDecisions(taskId = null) {
    if (taskId) {
      return this.data.decisions.filter(d => d.taskId === taskId);
    }
    return this.data.decisions;
  }

  clear() {
    this.data = {
      contacts: {},
      tasks: {},
      entities: {},
      decisions: []
    };
    this.save();
  }
}

export const memory = new ConversationMemory();
