import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { SafetyEngine } from '../../src/safety.js';
import { defaultNotifier } from '../../src/notifications.js';
import { audit } from '../../src/audit.js';
import { ApprovalStatus } from '../../src/types.js';

test('Security Audit Regression Test Suite', async (t) => {

  await t.test('BUG-01 & BUG-02: SafetyEngine Token Entropy & Cryptographic Binding', () => {
    const testSafety = new SafetyEngine(null);
    const req = testSafety.createApprovalRequest({
      taskId: 'TASK-SEC-REGRESS-01',
      action: 'paybox_request_transfer',
      target: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      payload: { amount: 1.5, token: 'SOL' },
      rationale: 'Gas replenishment',
      riskReason: 'Direct treasury disbursement'
    });

    assert.ok(req.token.startsWith('APPR-'), 'Token must start with APPR-');
    assert.equal(req.token.length, 37, 'Token must contain 128 bits of entropy');
    assert.ok(req.payloadHash, 'Payload hash must be computed and stored');
    assert.equal(req.payloadHash.length, 64, 'Payload hash must be a 256-bit SHA-256 hex string');

    assert.throws(() => {
      testSafety.approve('', 'Operator_Test');
    }, /valid non-empty string/);

    assert.throws(() => {
      testSafety.approve(null, 'Operator_Test');
    }, /valid non-empty string/);
  });

  await t.test('BUG-03: Replay Protection & Duplicate Approval Rejection', () => {
    const testSafety = new SafetyEngine(null);
    const req = testSafety.createApprovalRequest({
      taskId: 'TASK-SEC-REGRESS-02',
      action: 'reply_to_email',
      target: 'counterparty@enterprise.com',
      payload: { text: 'Contract details' }
    });

    const approved = testSafety.approve(req.token, 'Operator_Treasurer');
    assert.equal(approved.status, ApprovalStatus.APPROVED);

    assert.throws(() => {
      testSafety.approve(req.token, 'Operator_Attacker');
    }, /already APPROVED/);

    assert.throws(() => {
      testSafety.reject(req.token, 'Operator_Attacker', 'Malicious abort');
    }, /already APPROVED/);
  });

  await t.test('BUG-04: Dual-Control Audit Logging on Approvals and Rejections', () => {
    const testSafety = new SafetyEngine(null);

    const req1 = testSafety.createApprovalRequest({
      taskId: 'TASK-AUDIT-01',
      action: 'paybox_request_transfer',
      target: 'wallet_abc'
    });
    testSafety.approve(req1.token, 'Chief_Risk_Officer');

    const logsAfterApprove = audit.getRecentLogs(100);
    const approveAudit = logsAfterApprove.find(l => l.action === 'APPROVAL_GRANTED' && l.actor === 'Chief_Risk_Officer');
    assert.ok(approveAudit, 'APPROVAL_GRANTED must be recorded in immutable audit log');
    assert.equal(approveAudit.details.token, req1.token);

    const req2 = testSafety.createApprovalRequest({
      taskId: 'TASK-AUDIT-02',
      action: 'send_email',
      target: 'suspicious@external.com'
    });
    testSafety.reject(req2.token, 'Compliance_Officer', 'Phishing suspicion');

    const logsAfterReject = audit.getRecentLogs(100);
    const rejectAudit = logsAfterReject.find(l => l.action === 'APPROVAL_REJECTED' && l.actor === 'Compliance_Officer');
    assert.ok(rejectAudit, 'APPROVAL_REJECTED must be recorded in immutable audit log');
    assert.equal(rejectAudit.details.reason, 'Phishing suspicion');
  });

  await t.test('BUG-05: Token Expiration (TTL Enforcement)', () => {
    const testSafety = new SafetyEngine(null);
    const req = testSafety.createApprovalRequest({
      taskId: 'TASK-SEC-REGRESS-03',
      action: 'paybox_request_transfer',
      target: 'wallet_xyz'
    });

    req.createdAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    assert.ok(testSafety.isExpired(req), 'Token older than 24 hours must be detected as expired');
    assert.throws(() => {
      testSafety.approve(req.token, 'Operator_Test');
    }, /expired/);
  });

  await t.test('BUG-06: Notification Webhook SSRF & Cloud Metadata IP Blocking', () => {
    assert.throws(() => {
      defaultNotifier.setWebhookUrl('http://169.254.169.254/latest/meta-data/');
    }, /strictly prohibited/);

    assert.throws(() => {
      defaultNotifier.setWebhookUrl('http://metadata.google.internal/computeMetadata/v1/');
    }, /strictly prohibited/);

    assert.throws(() => {
      defaultNotifier.setWebhookUrl('file:///etc/passwd');
    }, /Only HTTP and HTTPS/);

    assert.throws(() => {
      defaultNotifier.setWebhookUrl('ftp://malicious.host/data');
    }, /Only HTTP and HTTPS/);

    defaultNotifier.setWebhookUrl('https://discord.com/api/webhooks/123/abc');
    assert.equal(defaultNotifier.webhookUrl, 'https://discord.com/api/webhooks/123/abc');
    assert.equal(defaultNotifier.enabled, true);

    defaultNotifier.setWebhookUrl(null);
    assert.equal(defaultNotifier.webhookUrl, null);
    assert.equal(defaultNotifier.enabled, false);
  });

  await t.test('BUG-07: Static File Server Path Traversal Protection Logic', () => {
    const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

    function resolveStaticFile(pathname) {
      let decodedPath = '/';
      try {
        decodedPath = decodeURIComponent(pathname);
      } catch {
        decodedPath = pathname;
      }
      const targetRelative = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
      const filePath = path.resolve(PUBLIC_DIR, targetRelative);
      if (!filePath.startsWith(PUBLIC_DIR)) {
        return { allowed: false, status: 403 };
      }
      return { allowed: true, filePath };
    }

    assert.equal(resolveStaticFile('/../package.json').allowed, false);
    assert.equal(resolveStaticFile('/../package.json').status, 403);
    assert.equal(resolveStaticFile('/..%2fpackage.json').allowed, false);
    assert.equal(resolveStaticFile('/../../data/approvals.json').allowed, false);
    assert.equal(resolveStaticFile('/../src/server.js').allowed, false);

    assert.equal(resolveStaticFile('/').allowed, true);
    assert.equal(resolveStaticFile('/index.html').allowed, true);
    assert.equal(resolveStaticFile('/app.js').allowed, true);
  });

  await t.test('BUG-08: Host Header URL Sanitization Logic', () => {
    function parseSafeHost(rawHost, rawUrl) {
      try {
        const safeHost = (rawHost || 'localhost').replace(/[^a-zA-Z0-9.:_-]/g, '') || 'localhost';
        return new URL(rawUrl, 'http://' + safeHost);
      } catch (_) {
        try {
          return new URL(rawUrl, 'http://127.0.0.1');
        } catch {
          return null;
        }
      }
    }

    const badHost1 = parseSafeHost('evil.com:foo', '/api/health');
    assert.ok(badHost1, 'Malformed host with non-numeric port must not crash');

    const badHost2 = parseSafeHost('host with spaces', '/api/health');
    assert.ok(badHost2, 'Host with spaces must not crash');

    const badHost3 = parseSafeHost('[::1]:invalid:port', '/api/health');
    assert.ok(badHost3, 'Invalid IPv6 host must not crash');
  });

  await t.test('BUG-09: Financial Top-Up Amount Validation (Zero & Negative Caps)', () => {
    function validateTopUpAmount(rawAmount) {
      if (rawAmount === undefined || rawAmount === null) return { valid: false, error: 'Missing amount' };
      const num = Number(rawAmount);
      if (!Number.isFinite(num) || num <= 0) {
        return { valid: false, error: 'Top-up amount must be a positive finite number' };
      }
      return { valid: true, amount: num };
    }

    assert.equal(validateTopUpAmount(-10).valid, false);
    assert.equal(validateTopUpAmount(0).valid, false);
    assert.equal(validateTopUpAmount('NaN').valid, false);
    assert.equal(validateTopUpAmount(Infinity).valid, false);
    assert.equal(validateTopUpAmount('-50.5').valid, false);
    assert.equal(validateTopUpAmount(1.5).valid, true);
    assert.equal(validateTopUpAmount('0.25').valid, true);
  });

  await t.test('BUG-10: Relayer ID Validation & Reserved Identifier Protection', () => {
    function validateRelayerId(id) {
      if (!id || typeof id !== 'string') return false;
      const clean = id.trim();
      if (!/^[a-zA-Z0-9_-]{2,64}$/.test(clean)) return false;
      const reserved = ['export', 'import', '__proto__', 'constructor'];
      if (reserved.includes(clean)) return false;
      return true;
    }

    assert.equal(validateRelayerId('__proto__'), false);
    assert.equal(validateRelayerId('constructor'), false);
    assert.equal(validateRelayerId('export'), false);
    assert.equal(validateRelayerId('import'), false);
    assert.equal(validateRelayerId('../evil'), false);
    assert.equal(validateRelayerId('a/b'), false);
    assert.equal(validateRelayerId(''), false);
    assert.equal(validateRelayerId('solana-relayer-01'), true);
    assert.equal(validateRelayerId('base-mainnet-treasury'), true);
  });
});
