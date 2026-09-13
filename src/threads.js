/**
 * Thread-Aware Email Intelligence
 * Handles thread reconstruction, timeline analysis, commitment tracking,
 * pending questions, and contradiction detection.
 */

export class ThreadAnalyzer {
  /**
   * Reconstructs an ordered thread from a list of messages.
   */
  static reconstructThread(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return [];

    return [...messages].sort((a, b) => {
      const timeA = new Date(a.date || a.created_at || a.timestamp || 0).getTime();
      const timeB = new Date(b.date || b.created_at || b.timestamp || 0).getTime();
      return timeA - timeB;
    });
  }

  /**
   * Extracts commitments made across messages in the thread.
   */
  static extractCommitments(messages) {
    const commitments = [];
    const commitmentPatterns = [
      /(?:i will|i'll|we will|we'll|promise to|going to|plan to)\s+([^.\n]+)/gi,
      /(?:by|before|until)\s+(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi,
      /(?:deliver|send|ship|review|schedule|pay|transfer)\s+([^.\n]+)/gi
    ];

    for (const msg of messages) {
      const body = msg.body || msg.content || msg.text || '';
      const sender = msg.from || msg.sender || 'unknown';
      const timestamp = msg.date || msg.created_at || msg.timestamp || new Date().toISOString();

      for (const pattern of commitmentPatterns) {
        let match;
        while ((match = pattern.exec(body)) !== null) {
          commitments.push({
            sender,
            text: match[0].trim(),
            details: match[1]?.trim() || match[0].trim(),
            timestamp,
            messageId: msg.id
          });
        }
      }
    }

    return commitments;
  }

  /**
   * Identifies questions asked in the thread that have not yet been answered.
   */
  static extractPendingQuestions(messages) {
    const questions = [];
    const ordered = this.reconstructThread(messages);

    ordered.forEach((msg, idx) => {
      const body = msg.body || msg.content || msg.text || '';
      const sender = msg.from || msg.sender || 'unknown';

      // Check if body contains explicit question mark
      const qMatches = body.match(/([^?\n]+\?)/g);
      if (qMatches) {
        for (const q of qMatches) {
          const qText = q.trim();
          // Check if subsequent messages from other senders address it
          const laterResponses = ordered.slice(idx + 1).filter(m => (m.from || m.sender) !== sender);
          
          let isAnswered = false;
          if (laterResponses.length > 0) {
            // Check if later response contains keywords or question was answered
            const qWords = qText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
            const answeredByContent = laterResponses.some(resp => {
              const respBody = (resp.body || resp.content || '').toLowerCase();
              return qWords.some(w => respBody.includes(w));
            });
            isAnswered = answeredByContent || laterResponses.length >= 1;
          }

          questions.push({
            sender,
            question: qText,
            askedAt: msg.date || msg.timestamp || new Date().toISOString(),
            messageId: msg.id,
            isAnswered
          });
        }
      }
    });

    return questions;
  }

  /**
   * Returns only unanswered questions from the thread.
   */
  static extractUnansweredQuestions(messages) {
    const allQuestions = this.extractPendingQuestions(messages);
    return allQuestions.filter(q => !q.isAnswered);
  }

  /**
   * Detects logical contradictions between latest message and past commitments/facts.
   */
  static detectContradictions(threadMessages, latestMessage) {
    const contradictions = [];
    if (!threadMessages || threadMessages.length === 0 || !latestMessage) {
      return contradictions;
    }

    const commitments = this.extractCommitments(threadMessages);
    const latestBody = (latestMessage.body || latestMessage.content || latestMessage.text || '').toLowerCase();
    const sender = latestMessage.from || latestMessage.sender || 'unknown';

    // Pattern 1: Sender promised action earlier, but now claims they never agreed or denies responsibility
    for (const comm of commitments) {
      if (comm.sender.toLowerCase() === sender.toLowerCase()) {
        const commText = comm.details.toLowerCase();
        if (
          latestBody.includes("never agreed") ||
          latestBody.includes("did not agree") ||
          latestBody.includes("didn't agree") ||
          latestBody.includes("haven't agreed") ||
          latestBody.includes("haven't received") ||
          latestBody.includes("not our responsibility")
        ) {
          if (commText.includes("send") || commText.includes("deliver") || commText.includes("proposal") || commText.includes("ship")) {
            contradictions.push({
              type: 'COMMITMENT_REVERSAL',
              description: `Sender previously committed to "${comm.text}" on ${comm.timestamp}, but now states: "${latestMessage.body.slice(0, 100)}..."`,
              severity: 'HIGH',
              priorCommitment: comm
            });
          }
        }
      }
    }

    // Pattern 2: Meeting time clash / shifting without reference
    if (latestBody.includes("cannot meet") || latestBody.includes("won't be able") || latestBody.includes("unable to attend")) {
      const scheduledAgreements = commitments.filter(c => c.text.toLowerCase().includes("meet") || c.text.toLowerCase().includes("call") || c.text.toLowerCase().includes("sync"));
      if (scheduledAgreements.length > 0) {
        contradictions.push({
          type: 'SCHEDULE_CONFLICT',
          description: `Previously agreed meeting time conflicts with newly expressed unavailability: "${latestMessage.body.slice(0, 100)}..."`,
          severity: 'MEDIUM',
          priorCommitment: scheduledAgreements[0]
        });
      }
    }

    // Pattern 3: Pricing & Budget Contradiction
    // E.g., prior thread agreed on $5,000 / $10k or has price quote, but latest email claims different number
    const priceRegex = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+)\s*(?:usd|dollars|\$|k\b)/gi;
    const priorPrices = [];
    for (const msg of threadMessages) {
      const body = msg.body || msg.content || '';
      let match;
      while ((match = priceRegex.exec(body)) !== null) {
        priorPrices.push({
          raw: match[0],
          sender: msg.from || msg.sender,
          snippet: body.slice(Math.max(0, match.index - 20), match.index + 30)
        });
      }
    }

    if (priorPrices.length > 0) {
      const claimsDispute = latestBody.includes("agreed on") || latestBody.includes("we quoted") || latestBody.includes("budget is only") || latestBody.includes("too expensive") || latestBody.includes("agreed to pay");
      let latestPriceMatch;
      const latestPrices = [];
      while ((latestPriceMatch = priceRegex.exec(latestBody)) !== null) {
        latestPrices.push(latestPriceMatch[0]);
      }

      if (claimsDispute && latestPrices.length > 0) {
        const priorPriceValues = priorPrices.map(p => p.raw.replace(/[^0-9]/g, ''));
        const latestPriceValues = latestPrices.map(p => p.replace(/[^0-9]/g, ''));
        const mismatch = latestPriceValues.some(lp => !priorPriceValues.includes(lp));

        if (mismatch) {
          contradictions.push({
            type: 'PRICING_CONTRADICTION',
            description: `Pricing mismatch: Earlier thread discussed ${priorPrices.map(p => p.raw).join(', ')}, but latest message states: "${latestPrices.join(', ')}" (${latestMessage.body.slice(0, 100)}...)`,
            severity: 'HIGH',
            priorPrices,
            claimedPrices: latestPrices
          });
        }
      }
    }

    // Pattern 4: Timeline / Deadline reversal
    // Prior committed to a deadline (e.g. "by Friday"), latest claims earlier deadline or denies agreement
    const deadlineKeywords = ['friday', 'monday', 'tuesday', 'wednesday', 'thursday', 'tomorrow', 'next week'];
    for (const comm of commitments) {
      const commLower = comm.text.toLowerCase();
      const mentionedDay = deadlineKeywords.find(d => commLower.includes(d));
      if (mentionedDay) {
        const otherDays = deadlineKeywords.filter(d => d !== mentionedDay);
        const claimsDifferentDay = otherDays.some(d => latestBody.includes(`deadline was ${d}`) || latestBody.includes(`agreed on ${d}`) || latestBody.includes(`due on ${d}`));
        if (claimsDifferentDay) {
          contradictions.push({
            type: 'TIMELINE_CONTRADICTION',
            description: `Timeline conflict: Prior commitment was '${comm.text}', but latest message claims a conflicting day: "${latestMessage.body.slice(0, 100)}..."`,
            severity: 'MEDIUM',
            priorCommitment: comm
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Summarizes chronological narrative of the thread.
   */
  static summarizeThread(messages) {
    const ordered = this.reconstructThread(messages);
    if (ordered.length === 0) return "Empty thread.";

    const summaryParts = [];
    ordered.forEach((msg, idx) => {
      const sender = msg.from || msg.sender || `Participant ${idx + 1}`;
      const snippet = (msg.body || msg.content || '').replace(/\s+/g, ' ').slice(0, 120);
      summaryParts.push(`[${idx + 1}] ${sender}: "${snippet}..."`);
    });

    return summaryParts.join('\n');
  }
}
