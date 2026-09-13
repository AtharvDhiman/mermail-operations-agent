/**
 * External Webhook and Notification Dispatcher.
 * Dispatches operational alerts and settlement receipts to configured
 * webhook endpoints (Discord, Slack, Telegram).
 */

export function isPrivateOrReservedHost(host) {
  if (!host || typeof host !== 'string') return true;
  let cleanHost = host.toLowerCase().trim().replace(/^\[|\]$/g, '');

  if (
    cleanHost === 'localhost' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.local') ||
    cleanHost.endsWith('.internal') ||
    cleanHost === 'metadata.google.internal'
  ) {
    return true;
  }

  // Check IPv6 loopback / unspecified / private
  if (
    cleanHost === '::1' ||
    cleanHost === '::' ||
    cleanHost === '0:0:0:0:0:0:0:1' ||
    cleanHost === '0:0:0:0:0:0:0:0' ||
    cleanHost.startsWith('fe80:') ||
    cleanHost.startsWith('fc00:') ||
    cleanHost.startsWith('fd')
  ) {
    return true;
  }

  // Handle IPv4 mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (cleanHost.startsWith('::ffff:')) {
    cleanHost = cleanHost.slice(7);
  }

  // Handle single integer or hex IP format (e.g. 2130706433 or 0x7f000001)
  if (/^(?:0x[0-9a-f]+|\d+)$/i.test(cleanHost)) {
    return true;
  }

  // Check standard IPv4 dotted notation
  const ipv4Match = cleanHost.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some(o => o < 0 || o > 255)) return true;

    const [a, b, c, d] = octets;

    // 0.0.0.0/8
    if (a === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private 172.16 - 172.31)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-local & Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 255.255.255.255 (Broadcast)
    if (a === 255 && b === 255 && c === 255 && d === 255) return true;
  }

  return false;
}

export class NotificationDispatcher {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.SENTINEL_WEBHOOK_URL || null;
    this.enabled = Boolean(this.webhookUrl);
    this.history = [];
  }

  setWebhookUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      this.webhookUrl = null;
      this.enabled = false;
      return;
    }

    const trimmed = url.trim();
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Only HTTP and HTTPS webhook URLs are allowed');
      }

      const hostname = parsed.hostname.toLowerCase();
      if (isPrivateOrReservedHost(hostname)) {
        throw new Error('Access to private, loopback, or cloud metadata endpoints is strictly prohibited');
      }

      this.webhookUrl = trimmed;
      this.enabled = true;
    } catch (err) {
      throw new Error(`Invalid webhook URL: ${err.message}`);
    }
  }

  /**
   * Dispatch an operational event to external systems.
   * @param {string} event - 'DEFICIT_DETECTED' | 'TRANSFER_SETTLED' | 'ATTACK_QUARANTINED' | 'WATCHDOG_ALERT'
   * @param {object} payload - Event metadata
   */
  async dispatch(event, payload) {
    const entry = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      event,
      payload,
      status: 'LOGGED'
    };

    if (!this.webhookUrl) {
      entry.status = 'LOCAL_ONLY_NO_WEBHOOK';
      this.history.unshift(entry);
      if (this.history.length > 50) this.history.pop();
      return entry;
    }

    const messageContent = this.formatMessage(event, payload);

    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageContent),
        signal: AbortSignal.timeout(5000)
      });

      entry.status = res.ok ? 'DELIVERED' : `HTTP_${res.status}`;
    } catch (err) {
      entry.status = `FAILED: ${err.message}`;
    }

    this.history.unshift(entry);
    if (this.history.length > 50) this.history.pop();
    return entry;
  }

  formatMessage(event, payload) {
    const title = `[SENTINEL ALERT] ${event}`;
    let desc = '';

    if (event === 'DEFICIT_DETECTED') {
      desc = `Relayer: ${payload.relayerId}\nChain: ${payload.chain}\nBalance: ${payload.balance}\nThreshold: ${payload.threshold}`;
    } else if (event === 'TRANSFER_SETTLED') {
      desc = `PayBox Transfer Settled!\nRelayer: ${payload.relayerId}\nAmount: ${payload.amount}\nTx: ${payload.txHash}`;
    } else if (event === 'ATTACK_QUARANTINED') {
      desc = `Security Shield Blocked Malicious Inbound Prompt!\nSender: ${payload.from}\nStatus: Quarantined, Zero Funds Moved.`;
    } else {
      desc = JSON.stringify(payload, null, 2);
    }

    return {
      username: 'Mermail Relayer Sentinel',
      content: `**${title}**\n${desc}`
    };
  }

  getRecentNotifications(limit = 20) {
    return this.history.slice(0, limit);
  }
}

export const defaultNotifier = new NotificationDispatcher();
