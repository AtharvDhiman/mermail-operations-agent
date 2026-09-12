import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

export class AuditHistoryTracker {
  constructor(filePath = HISTORY_FILE) {
    this.filePath = filePath;
    this.events = [];
    this.load();
  }

  load() {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf8');
        this.events = JSON.parse(raw);
      }
    } catch (_) {
      this.events = [];
    }
  }

  save() {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.events, null, 2), 'utf8');
    } catch (err) {
      console.error('[AuditHistory] Failed to write history file:', err.message);
    }
  }

  recordEvent(type, payload = {}) {
    const entry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      ...payload
    };
    this.events.unshift(entry);
    // Keep max 500 records
    if (this.events.length > 500) {
      this.events.length = 500;
    }
    this.save();
    return entry;
  }

  getEvents(limit = 50, type = null) {
    let filtered = this.events;
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    return filtered.slice(0, limit);
  }

  exportCsv() {
    const headers = ['ID', 'Timestamp', 'Type', 'Relayer ID', 'Chain', 'Amount', 'Tx Hash', 'Status', 'Details'];
    const rows = this.events.map(e => [
      e.id,
      e.timestamp,
      e.type,
      e.relayerId || '',
      e.chain || '',
      e.amount || '',
      e.txHash || '',
      e.status || '',
      `"${(e.details || e.reason || '').replace(/"/g, '""')}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  clear() {
    this.events = [];
    this.save();
  }
}

export const defaultHistory = new AuditHistoryTracker();
