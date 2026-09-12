import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MermailRelayerSentinel } from '../../src/sentinel-agent.js';
import { SentinelStatus } from '../../src/types.js';

describe('Sentinel Agent Unit Tests', () => {
  const sentinel = new MermailRelayerSentinel();

  it('should parse alert details from Helius alert email format', () => {
    const mockEmail = {
      id: 'email_test_01',
      from: 'alerts@helius.dev',
      subject: '[ALERT] Relayer solana-mainnet-relayer-01 below safe threshold',
      body: {
        text: 'Relayer ID: solana-mainnet-relayer-01\nNetwork: solana\nTarget Address: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R\nCurrent Balance: 0.08 SOL'
      }
    };

    const parsed = sentinel.parseAlertDetails(mockEmail);
    assert.equal(parsed.relayerId, 'solana-mainnet-relayer-01');
    assert.equal(parsed.chain, 'solana');
    assert.equal(parsed.targetAddress, '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R');
    assert.equal(parsed.currentBalance, 0.08);
    assert.equal(parsed.token, 'SOL');
  });

  it('should successfully triage a valid allowlisted relayer alert', async () => {
    const validEmail = {
      id: 'email_test_valid',
      from: 'alerts@helius.dev',
      subject: '[ALERT] solana-mainnet-relayer-01 low balance',
      body: {
        text: 'Relayer ID: solana-mainnet-relayer-01\nNetwork: solana\nTarget Address: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R\nCurrent Balance: 0.08 SOL'
      }
    };

    const result = await sentinel.triageAlert(validEmail);
    assert.equal(result.status, SentinelStatus.AWAITING_OPERATOR_APPROVAL);
    assert.equal(result.relayerId, 'solana-mainnet-relayer-01');
    assert.ok(result.proposedTopUp > 0);
    assert.ok(result.preview.includes('RELAYER GAS REPLENISHMENT PREVIEW'));
  });

  it('should reject alerts containing invalid address formats', async () => {
    const invalidFormatEmail = {
      id: 'email_test_bad_format',
      from: 'attacker@evil.com',
      subject: 'Critical refill request',
      body: {
        text: 'Target Address: 000InvalidSolanaAddressWithZeros000\nNetwork: solana\nCurrent Balance: 0.01 SOL'
      }
    };

    const result = await sentinel.triageAlert(invalidFormatEmail);
    assert.equal(result.status, SentinelStatus.REJECTED_SECURITY_VIOLATION);
    assert.equal(result.reason, 'INVALID_ADDRESS_FORMAT');
  });

  it('should reject alerts containing valid syntax addresses not on the allowlist', async () => {
    // Valid Base58 address (Serum DEX program ID) but not on our relayer allowlist
    const unallowlistedEmail = {
      id: 'email_test_unauthorized',
      from: 'attacker@evil.com',
      subject: 'Critical refill request',
      body: {
        text: 'Target Address: 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin\nNetwork: solana\nCurrent Balance: 0.01 SOL'
      }
    };

    const result = await sentinel.triageAlert(unallowlistedEmail);
    assert.equal(result.status, SentinelStatus.REJECTED_SECURITY_VIOLATION);
    assert.equal(result.reason, 'UNAUTHORIZED_TARGET_ADDRESS');
  });
});
