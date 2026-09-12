/**
 * External Webhook and Notification Dispatcher.
 * Dispatches operational alerts and settlement receipts to configured
 * webhook endpoints (Discord, Slack, Telegram).
 */

export class NotificationDispatcher {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.SENTINEL_WEBHOOK_URL || null;
    this.enabled = Boolean(this.webhookUrl);
    this.history = [];
  }

  setWebhookUrl(url) {
    this.webhookUrl = url;
    this.enabled = Boolean(url);
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
