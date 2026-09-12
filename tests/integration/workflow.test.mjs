import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MermailRelayerSentinel } from '../../src/sentinel-agent.js';
import { SentinelStatus } from '../../src/types.js';

describe('End-to-End Workflow Integration Tests', () => {
  it('should complete full cycle: scan -> triage -> approve -> settle -> receipt', async () => {
    const sentinel = new MermailRelayerSentinel();

    // 1. Scan inbox
    const incidents = await sentinel.scanForIncidents();
    assert.ok(incidents.length > 0);

    // Find the valid incident
    const validIncident = incidents.find((i) => i.status === SentinelStatus.AWAITING_OPERATOR_APPROVAL);
    assert.ok(validIncident, 'Expected at least one valid pending incident');
    assert.equal(validIncident.relayerId, 'solana-mainnet-relayer-01');

    // 2. Execute replenishment with operator approval
    const execution = await sentinel.executeReplenishment(validIncident);

    // 3. Verify settlement results
    assert.equal(execution.status, SentinelStatus.SETTLED_ON_CHAIN);
    assert.ok(execution.requestId);
    assert.ok(execution.txHash);
    assert.ok(execution.signingUrl);

    // 4. Verify mock server state
    const mockServer = sentinel.client.mockServer;
    
    // Reply sent
    const reply = mockServer.sentReplies.find((r) => r.emailId === validIncident.emailId);
    assert.ok(reply, 'Expected reply to be sent to the alerting provider thread');
    assert.ok(reply.body.text.includes(execution.txHash));

    // Audit draft saved
    const draft = mockServer.drafts.find((d) => d.subject.includes(validIncident.relayerId));
    assert.ok(draft, 'Expected treasury audit draft to be created in Mermail');

    // Alert marked read
    const email = mockServer.emails.find((e) => e.id === validIncident.emailId);
    assert.equal(email.isRead, true);

    // Treasury balance deducted
    const remainingSol = mockServer.portfolio.chains.solana.SOL;
    assert.ok(remainingSol < 5.42);
  });
});
