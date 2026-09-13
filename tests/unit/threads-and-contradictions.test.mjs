import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ThreadAnalyzer } from '../../src/threads.js';

describe('Thread Intelligence & Contradiction Unit Tests', () => {
  it('should reconstruct message chronology in thread', () => {
    const messages = [
      { id: 'm3', date: '2026-09-12T15:00:00Z', body: 'Third message' },
      { id: 'm1', date: '2026-09-12T09:00:00Z', body: 'First message' },
      { id: 'm2', date: '2026-09-12T12:00:00Z', body: 'Second message' }
    ];

    const ordered = ThreadAnalyzer.reconstructThread(messages);
    assert.equal(ordered[0].id, 'm1');
    assert.equal(ordered[1].id, 'm2');
    assert.equal(ordered[2].id, 'm3');
  });

  it('should extract commitments made by participants', () => {
    const messages = [
      {
        id: 'm1',
        from: 'elena@partner.com',
        body: 'I will send the partnership proposal by tomorrow.',
        date: '2026-09-12T10:00:00Z'
      }
    ];

    const commitments = ThreadAnalyzer.extractCommitments(messages);
    assert.ok(commitments.length > 0);
    assert.equal(commitments[0].sender, 'elena@partner.com');
    assert.ok(commitments[0].text.toLowerCase().includes('send'));
  });

  it('should detect contradictions when sender reverses previous commitment', () => {
    const threadMessages = [
      {
        id: 'm1',
        from: 'elena@partner.com',
        body: 'I will send the signed proposal by tomorrow.',
        date: '2026-09-12T10:00:00Z'
      }
    ];

    const contradictingMessage = {
      id: 'm2',
      from: 'elena@partner.com',
      body: 'I never agreed to send the proposal, who told you this?',
      date: '2026-09-13T10:00:00Z'
    };

    const contradictions = ThreadAnalyzer.detectContradictions(threadMessages, contradictingMessage);
    assert.ok(contradictions.length > 0);
    assert.equal(contradictions[0].type, 'COMMITMENT_REVERSAL');
    assert.equal(contradictions[0].severity, 'HIGH');
  });

  it('should detect pricing contradictions between agreed budget and new message', () => {
    const threadMessages = [
      {
        id: 'm1',
        from: 'sales@vendor.com',
        body: 'We agreed on $5,000 USD for the initial enterprise implementation.',
        date: '2026-09-10T10:00:00Z'
      }
    ];

    const contradictingMessage = {
      id: 'm2',
      from: 'buyer@client.com',
      body: 'As discussed, we agreed on $2,000 USD for the implementation. Please send invoice.',
      date: '2026-09-11T12:00:00Z'
    };

    const contradictions = ThreadAnalyzer.detectContradictions(threadMessages, contradictingMessage);
    assert.ok(contradictions.length > 0);
    const pricingConflict = contradictions.find(c => c.type === 'PRICING_CONTRADICTION');
    assert.ok(pricingConflict);
    assert.equal(pricingConflict.severity, 'HIGH');
  });

  it('should detect timeline and schedule conflicts', () => {
    const threadMessages = [
      {
        id: 'm1',
        from: 'engineer@corp.com',
        body: 'I will deliver the audit report by Friday.',
        date: '2026-09-10T10:00:00Z'
      }
    ];

    const contradictingMessage = {
      id: 'm2',
      from: 'manager@corp.com',
      body: 'You agreed on Monday as the deadline for the report.',
      date: '2026-09-11T12:00:00Z'
    };

    const contradictions = ThreadAnalyzer.detectContradictions(threadMessages, contradictingMessage);
    assert.ok(contradictions.length > 0);
    const timelineConflict = contradictions.find(c => c.type === 'TIMELINE_CONTRADICTION');
    assert.ok(timelineConflict);
    assert.equal(timelineConflict.severity, 'MEDIUM');
  });

  it('should identify unanswered questions in thread', () => {
    const thread = [
      {
        id: 'm1',
        from: 'alice@corp.com',
        body: 'Could you clarify the delivery timeline? Also what is the payment schedule?',
        date: '2026-09-10T09:00:00Z'
      },
      {
        id: 'm2',
        from: 'bob@corp.com',
        body: 'The delivery timeline is 2 weeks.',
        date: '2026-09-10T11:00:00Z'
      },
      {
        id: 'm3',
        from: 'alice@corp.com',
        body: 'Thanks. Do you support multi-sig wallets for payments?',
        date: '2026-09-10T12:00:00Z'
      }
    ];

    const pending = ThreadAnalyzer.extractPendingQuestions(thread);
    assert.ok(pending.length >= 2);
    
    // The last question from alice has no response after it
    const unanswered = ThreadAnalyzer.extractUnansweredQuestions(thread);
    assert.ok(unanswered.length > 0);
    assert.ok(unanswered.some(q => q.question.includes('multi-sig')));
  });
});

