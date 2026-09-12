/**
 * Autonomous Watchdog for Mermail Relayer Sentinel.
 * Continuously polls allowlisted relayers directly via on-chain RPC.
 * When a relayer falls below its minimum operating threshold, the watchdog
 * synthesizes a deficit alert directly into the Mermail inbox and dispatches notifications.
 */

import { getOnChainBalance } from './rpc.js';
import { defaultNotifier } from './notifications.js';
import { defaultHistory } from './history.js';

export class SentinelWatchdog {
  constructor({ agent, config, onBroadcast = () => {}, intervalMs = 30000 }) {
    this.agent = agent;
    this.config = config;
    this.onBroadcast = onBroadcast;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.isRunning = false;
    this.lastCheck = null;
    this.checkCount = 0;
    this.deficitsFound = 0;
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  start(intervalMs = null) {
    if (intervalMs) this.intervalMs = intervalMs;
    if (this.isRunning) return;

    this.isRunning = true;
    this.onBroadcast('log', { message: `[WATCHDOG] Autonomous RPC sentinel started (Interval: ${this.intervalMs / 1000}s)` });
    this.onBroadcast('watchdog_status', this.getStatus());

    // Run first check immediately, then schedule
    this.performCheck();
    this.timer = setInterval(() => this.performCheck(), this.intervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    clearInterval(this.timer);
    this.timer = null;
    this.isRunning = false;
    this.onBroadcast('log', { message: '[WATCHDOG] Autonomous RPC sentinel stopped' });
    this.onBroadcast('watchdog_status', this.getStatus());
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      lastCheck: this.lastCheck,
      checkCount: this.checkCount,
      deficitsFound: this.deficitsFound
    };
  }

  async performCheck() {
    this.checkCount++;
    this.lastCheck = new Date().toISOString();
    const activeRelayers = (this.config.relayers || []).filter(r => r.enabled);

    for (const relayer of activeRelayers) {
      try {
        const onChain = await getOnChainBalance(relayer.chain, relayer.address);
        if (!onChain.success) {
          this.onBroadcast('log', { message: `[WATCHDOG] Warning: Failed RPC query for ${relayer.id}: ${onChain.error}` });
          continue;
        }

        const balance = onChain.balance;
        if (balance < relayer.minThreshold) {
          this.deficitsFound++;
          this.onBroadcast('log', {
            message: `[WATCHDOG DEFICIT] ${relayer.id} (${relayer.chain}) balance ${balance} < threshold ${relayer.minThreshold} ${relayer.token}!`
          });

          // Create alert email in Mermail inbox
          const deficitEmail = {
            id: `email_watchdog_${Date.now()}_${relayer.id}`,
            from: relayer.alertEmailSender || 'watchdog@mermail.internal',
            to: this.config.mailboxId,
            subject: `[WATCHDOG] Low Balance Alert: ${relayer.name}`,
            date: new Date().toISOString(),
            isRead: false,
            body: {
              text: [
                '--- SENTINEL AUTONOMOUS WATCHDOG ALERT ---',
                `Relayer ID: ${relayer.id}`,
                `Network: ${relayer.chain}`,
                `Target Address: ${relayer.address}`,
                `Current Balance: ${balance} ${relayer.token}`,
                `Threshold: ${relayer.minThreshold} ${relayer.token}`,
                `Target Balance: ${relayer.targetBalance} ${relayer.token}`,
                `Timestamp: ${new Date().toISOString()}`
              ].join('\n')
            }
          };

          this.agent.client.mockServer.emails.unshift(deficitEmail);
          this.onBroadcast('new_alert', deficitEmail);

          defaultHistory.recordEvent('WATCHDOG_DEFICIT_DETECTED', {
            relayerId: relayer.id,
            chain: relayer.chain,
            currentBalance: balance,
            threshold: relayer.minThreshold
          });

          await defaultNotifier.dispatch('DEFICIT_DETECTED', {
            relayerId: relayer.id,
            chain: relayer.chain,
            balance: `${balance} ${relayer.token}`,
            threshold: `${relayer.minThreshold} ${relayer.token}`
          });
        }
      } catch (err) {
        this.onBroadcast('log', { message: `[WATCHDOG ERROR] ${relayer.id}: ${err.message}` });
      }
    }

    this.onBroadcast('watchdog_status', this.getStatus());
  }
}
