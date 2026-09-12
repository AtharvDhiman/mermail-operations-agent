import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SentinelWatchdog } from '../../src/watchdog.js';
import { NotificationDispatcher } from '../../src/notifications.js';
import { getAnalyticsSummary } from '../../src/analytics.js';
import { getNetworkMetrics, pingRpcEndpoints } from '../../src/rpc.js';
import { MermailRelayerSentinel } from '../../src/sentinel-agent.js';
import { loadConfig } from '../../src/config.js';

describe('Watchdog, Telemetry & Analytics Tests', () => {
  const config = loadConfig();
  const agent = new MermailRelayerSentinel({ config });

  it('should initialize watchdog and track execution lifecycle', () => {
    let broadcastCount = 0;
    const watchdog = new SentinelWatchdog({
      agent,
      config,
      onBroadcast: () => { broadcastCount++; },
      intervalMs: 1000
    });

    const initialStatus = watchdog.getStatus();
    assert.equal(initialStatus.isRunning, false);
    assert.equal(initialStatus.checkCount, 0);

    watchdog.start();
    assert.equal(watchdog.isRunning, true);
    assert.ok(broadcastCount > 0);

    watchdog.stop();
    assert.equal(watchdog.isRunning, false);
  });

  it('should format and dispatch operational notifications', async () => {
    const notifier = new NotificationDispatcher();
    assert.equal(notifier.enabled, false);

    const entry = await notifier.dispatch('DEFICIT_DETECTED', {
      relayerId: 'test-relayer-01',
      chain: 'solana',
      balance: '0.04 SOL',
      threshold: '0.10 SOL'
    });

    assert.equal(entry.event, 'DEFICIT_DETECTED');
    assert.equal(entry.status, 'LOCAL_ONLY_NO_WEBHOOK');

    const recent = notifier.getRecentNotifications();
    assert.ok(recent.length > 0);
    assert.equal(recent[0].payload.relayerId, 'test-relayer-01');
  });

  it('should compute aggregated analytics from history and policy', () => {
    const summary = getAnalyticsSummary(config, agent.budgetTracker);
    assert.ok(summary.metrics);
    assert.ok(summary.treasury);
    assert.ok(summary.systemHealth);
    assert.equal(summary.systemHealth.status, 'HEALTHY');
    assert.equal(summary.treasury.dailyCapUsd, 500);
    assert.ok(summary.metrics.relayersCount >= 3);
  });

  it('should query live network telemetry with latency benchmark', async () => {
    const telemetry = await getNetworkMetrics();
    assert.ok(telemetry.timestamp);
    assert.ok(telemetry.solana);
    assert.ok(telemetry.base);
    assert.ok(telemetry.health);
  });

  it('should benchmark round-trip latency across RPC providers', async () => {
    const pings = await pingRpcEndpoints();
    assert.ok(pings.solana);
    assert.ok(pings.base);
    assert.ok(pings.ethereum);
    assert.equal(typeof pings.solana.status, 'string');
  });
});
