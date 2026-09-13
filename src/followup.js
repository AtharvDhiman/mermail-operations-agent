/**
 * Persistent Follow-Up Engine
 * Manages multi-day communication cadences (Day 0, Day 3, Day 7),
 * auto-cancels upon inbound reply detection, and prevents notification spam.
 */

import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { EmailComposer } from './composer.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const FOLLOWUPS_FILE = path.join(DATA_DIR, 'followups.json');

export class FollowUpEngine {
  constructor(storagePath = FOLLOWUPS_FILE) {
    this.storagePath = storagePath;
    this.followups = [];
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
        this.followups = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      logger.warn(`Failed to read follow-up file, using memory store: ${err.message}`);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.followups, null, 2), 'utf8');
    } catch (err) {
      logger.error(`Failed to save follow-ups: ${err.message}`);
    }
  }

  /**
   * Schedules a persistent follow-up check for an email thread
   */
  scheduleFollowup({
    taskId,
    threadId,
    recipient,
    subject = '',
    category = 'SUPPORT',
    cadenceDays = 3,
    maxFollowups = 2,
    stopOnReply = true,
    escalateOnMax = false
  }) {
    const id = `FUP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const scheduledDate = new Date(Date.now() + cadenceDays * 24 * 60 * 60 * 1000).toISOString();

    const record = {
      id,
      taskId,
      threadId,
      recipient,
      subject,
      category,
      cadenceDays,
      scheduledDate,
      maxFollowups,
      currentCount: 0,
      stopOnReply,
      escalateOnMax,
      status: 'SCHEDULED', // SCHEDULED, CANCELLED_BY_REPLY, COMPLETED, ESCALATED
      createdAt: new Date().toISOString()
    };

    this.followups.push(record);
    this.save();

    logger.info(`Scheduled follow-up [${id}] for ${recipient} in ${cadenceDays} day(s)`, { taskId, threadId });
    return record;
  }

  /**
   * Fast-forwards time for testing: shifts scheduled dates earlier by N days.
   */
  advanceTimeForTesting(days = 3) {
    const shiftMs = days * 24 * 60 * 60 * 1000;
    let modified = 0;
    for (const fup of this.followups) {
      if (fup.status === 'SCHEDULED') {
        const prev = new Date(fup.scheduledDate).getTime();
        fup.scheduledDate = new Date(prev - shiftMs).toISOString();
        modified += 1;
      }
    }
    if (modified > 0) this.save();
    return modified;
  }

  /**
   * Evaluates inbound messages and cancels follow-up if recipient replied
   */
  handleInboundReply(threadId, sender) {
    if (!threadId) return [];
    const cancelled = [];

    for (const fup of this.followups) {
      if (fup.threadId === threadId && fup.status === 'SCHEDULED' && fup.stopOnReply) {
        fup.status = 'CANCELLED_BY_REPLY';
        fup.cancelledAt = new Date().toISOString();
        fup.cancelReason = `Inbound response received from ${sender}`;
        cancelled.push(fup);
        logger.info(`Auto-cancelled follow-up [${fup.id}] - reply received from ${sender}`, { threadId });
      }
    }

    if (cancelled.length > 0) {
      this.save();
    }
    return cancelled;
  }

  /**
   * Checks due follow-ups and returns actions to take
   */
  getDueFollowups(now = new Date()) {
    const currentTime = now.getTime();
    return this.followups.filter(fup => {
      if (fup.status !== 'SCHEDULED') return false;
      const dueTime = new Date(fup.scheduledDate).getTime();
      return dueTime <= currentTime;
    });
  }

  /**
   * Executes or triggers a due follow-up
   */
  executeFollowup(fupId) {
    const fup = this.followups.find(f => f.id === fupId);
    if (!fup || fup.status !== 'SCHEDULED') {
      return null;
    }

    fup.currentCount += 1;

    if (fup.currentCount >= fup.maxFollowups) {
      if (fup.escalateOnMax) {
        fup.status = 'ESCALATED';
        fup.escalatedAt = new Date().toISOString();
        logger.warn(`Follow-up cadence exhausted for [${fup.id}] without response; escalated to operator`, { taskId: fup.taskId });
      } else {
        fup.status = 'COMPLETED';
        fup.completedAt = new Date().toISOString();
      }
    } else {
      // Reschedule for next cadence (e.g. +4 days to reach Day 7)
      fup.scheduledDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
    }

    const draft = EmailComposer.compose({
      category: fup.category,
      recipient: fup.recipient,
      subject: fup.subject.startsWith('Following up') ? fup.subject : `Following up: ${fup.subject}`,
      tone: 'polite',
      customNotes: 'Friendly check-in regarding our previous message.'
    });

    this.save();
    logger.info(`Dispatched follow-up ping #${fup.currentCount} for [${fup.id}] to ${fup.recipient}`, { taskId: fup.taskId });

    return {
      followup: fup,
      draft
    };
  }

  cancel(fupId, reason = 'Operator cancelled') {
    const fup = this.followups.find(f => f.id === fupId);
    if (!fup) return null;
    fup.status = 'CANCELLED';
    fup.cancelledAt = new Date().toISOString();
    fup.cancelReason = reason;
    this.save();
    return fup;
  }

  list() {
    return this.followups;
  }

  clear() {
    this.followups = [];
    this.save();
  }
}

export const followup = new FollowUpEngine();
