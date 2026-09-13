import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InboxTriage } from '../../src/triage.js';

describe('Intelligent Inbox Triage Extended Unit Tests', () => {
  describe('Advanced Deadline Parsing', () => {
    it('should extract relative and day-based deadlines', () => {
      const email = {
        id: 'em_deadline_1',
        from: 'partner@tech.io',
        subject: 'Contract Review Timeline',
        body: 'Please review the agreement and send signed copy by Friday at 5:00 PM UTC.'
      };

      const task = InboxTriage.triageEmail(email);
      assert.ok(task.deadlines.length > 0);
      assert.ok(task.deadlines.some(d => d.toLowerCase().includes('friday')));
    });

    it('should parse EOD and in N hours deadlines', () => {
      const email = {
        id: 'em_deadline_2',
        from: 'boss@corp.com',
        subject: 'Quarterly Numbers needed EOD',
        body: 'Can you provide the final ARR numbers before EOD today? Need them in 2 hours for board prep.'
      };

      const task = InboxTriage.triageEmail(email);
      assert.ok(task.deadlines.length > 0);
      assert.ok(task.deadlines.some(d => d.toLowerCase().includes('eod') || d.toLowerCase().includes('2 hours')));
    });
  });

  describe('Question & Request Extraction', () => {
    it('should extract interrogatives and polite requests', () => {
      const email = {
        id: 'em_q_1',
        from: 'client@domain.com',
        subject: 'Inquiry about SLA and SOC2',
        body: 'Could you clarify your uptime SLA? Also, what is your standard payment term? Please send us your SOC2 Type II report when available.'
      };

      const questions = InboxTriage.extractQuestions(email.body);
      assert.ok(questions.length >= 2);
      assert.ok(questions.some(q => q.toLowerCase().includes('sla')));

      const requests = InboxTriage.extractRequests(email.body);
      assert.ok(requests.length >= 1);
      assert.ok(requests.some(r => r.toLowerCase().includes('soc2')));
    });
  });

  describe('Digest & No-Action Detection', () => {
    it('should flag automated newsletters and digests as no-action', () => {
      const email = {
        id: 'em_digest_1',
        from: 'newsletter@substack.com',
        subject: 'Weekly Crypto & AI Tech Digest #42',
        body: 'Here are the top 10 developments in AI this week. To unsubscribe, click here.'
      };

      const isNoAction = InboxTriage.isNoAction(email);
      assert.equal(isNoAction, true);

      const task = InboxTriage.triageEmail(email);
      assert.equal(task.requiresAction, false);
      assert.equal(task.priority, 'P4');
    });

    it('should NOT flag urgent customer requests as no-action', () => {
      const email = {
        id: 'em_urgent_cust',
        from: 'cto@enterprise.com',
        subject: 'API outage in production',
        body: 'Our integration is failing. Please investigate immediately.'
      };

      const isNoAction = InboxTriage.isNoAction(email);
      assert.equal(isNoAction, false);

      const task = InboxTriage.triageEmail(email);
      assert.equal(task.requiresAction, true);
    });
  });
});
