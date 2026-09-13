# Mermail Autonomous Operations Agent: Workflow Specifications

This document outlines the state machine transitions and execution workflows across the 4 specialized agent modes.

## Finite State Machine

Tasks progress through 11 deterministic states:

```
RECEIVED ➔ CLASSIFIED ➔ PLANNED ➔ WAITING_APPROVAL ➔ EXECUTING ➔ VERIFYING ➔ WAITING_FOR_REPLY ➔ COMPLETED
                                                            ↓
                                                          FAILED ➔ RETRYING ➔ ESCALATED
```

- **`RECEIVED`**: Inbound email ingested from Mermail mailbox.
- **`CLASSIFIED`**: Intent, urgency, priority, and confidence scored by triage engine.
- **`PLANNED`**: Decomposed into DAG steps with tool assignments and risk ratings.
- **`WAITING_APPROVAL`**: Paused pending operator review for high-risk action.
- **`EXECUTING`**: Running safe actions and approved high-risk tools.
- **`VERIFYING`**: Validating outcome against verification criteria.
- **`WAITING_FOR_REPLY`**: Paused waiting for customer response with active follow-up cadence.
- **`COMPLETED`**: Final settlement reached and verified.
- **`FAILED` / `RETRYING` / `ESCALATED`**: Error recovery lifecycle with backoff or human brief.

---

## 4 Specialized Operational Modes

### 1. Customer Support Mode (`SUPPORT`)
1. **Analyze**: Inbound ticket parsed for technical issue, error codes, and sentiment.
2. **Draft**: Solution draft composed using knowledge-base context.
3. **Approve**: Operator reviews troubleshooting draft.
4. **Deliver**: Dispatched via `reply_to_email`.
5. **Follow-Up**: Day 3 satisfaction check scheduled; auto-cancels if user confirms resolution.

### 2. Sales & GTM Mode (`SALES_GTM`)
1. **Qualify**: Evaluates inbound domain, team scale, and budget indicators.
2. **Draft**: Tailors value proposition and proposal summary.
3. **Sign-Off**: High-risk email send authorized via token.
4. **Outreach**: Message sent via `send_email`.
5. **Cadence**: Day 3 and Day 7 follow-ups registered; auto-cancels upon lead response.

### 3. Meeting Scheduling Mode (`SCHEDULING`)
1. **Parse**: Extracts proposed timeslots, dates, and timezones.
2. **Resolve**: Checks calendar constraints for conflicts.
3. **Propose**: Saves draft with 2-3 candidate timeslots.
4. **Send**: Delivered via `reply_to_email` upon operator approval.
5. **Monitor**: Day 2 check queued; auto-cancels when counterparty confirms a slot.

### 4. General Ops & Treasury Rebalancing (`GENERAL_OPS`)
1. **Monitor**: Low-gas alert parsed from RPC monitor email.
2. **Inspect**: Treasury liquidity inspected via `paybox_get_portfolio`.
3. **Propose**: Replenishment transfer prepared with buffer.
4. **Authorize**: Dual-control approval token granted by operator.
5. **Execute**: On-chain transfer submitted via `paybox_request_transfer`.
6. **Receipt**: TxHash verified via `paybox_get_request` and receipt sent via `reply_to_email`.
