# Mermail Autonomous Operations Agent: Testing Methodology

## Overview

The project maintains a comprehensive test suite of **97 automated tests** across **42 test suites**, covering unit, integration, security red-team, and failure recovery scenarios. All tests use Node.js native `node:test` runner with `node:assert/strict` — zero external test dependencies.

---

## Test Suite Structure

```
tests/
├── unit/                                          # 14 unit test files
│   ├── triage.test.mjs                            # Intent classification, urgency, entity extraction
│   ├── triage-extended.test.mjs                   # Deadline parsing, digest/no-action detection
│   ├── planner.test.mjs                           # DAG step decomposition, risk tagging
│   ├── safety-and-approvals.test.mjs              # Dual-control tokens, approve/reject lifecycle
│   ├── security.test.mjs                          # Address validation, allowlist, email sanitization
│   ├── red-team-security.test.mjs                 # 8 adversarial attack vectors (Rule #29)
│   ├── failure-recovery-and-verification.test.mjs # FSM validation, backoff, verification, follow-up
│   ├── fsm-and-recovery.test.mjs                  # State machine transitions, deduplication
│   ├── sentinel.test.mjs                          # Relayer sentinel agent behavior
│   ├── threads-and-contradictions.test.mjs        # Thread chronology, commitment contradictions
│   ├── followup-and-idempotency.test.mjs          # Follow-up cadences, auto-cancel, idempotency
│   ├── watchdog-and-telemetry.test.mjs            # Watchdog lifecycle, RPC latency benchmarks
│   └── x402-payments.test.mjs                     # HTTP 402 detection, PayBox dual-control
├── integration/                                   # 3 integration test files
│   ├── autonomous-lifecycle.test.mjs              # Full ingest-to-completion lifecycle
│   ├── operations-workflow.test.mjs               # End-to-end dual-control approval flow
│   └── workflow.test.mjs                          # Multi-step workflow execution
└── validate-skill.mjs                             # Official Mermail Skill upstream validator
```

---

## Running Tests

```bash
# Run all 97 tests
npm test

# Run skill validator (YAML frontmatter, <500 lines, official tools)
npm run test:skill

# Run both in sequence
npm run validate

# Run a single test file
node --test tests/unit/red-team-security.test.mjs

# Run with spec reporter for verbose output
node --test --test-reporter=spec tests/unit/*.test.mjs tests/integration/*.test.mjs
```

---

## Red Team Security Test Suite (8 Attack Vectors)

File: `tests/unit/red-team-security.test.mjs`

| Vector | Attack Type | Defense Validated |
| :--- | :--- | :--- |
| 1 | Adversarial Prompt Injection | `SafetyEngine.detectPromptInjection` blocks instruction override and quarantines email |
| 2 | Secret & Credential Exfiltration | `sanitizeEmailContent` scrubs API key / password extraction attempts |
| 3 | Unauthorized Treasury Transfer | `classifyActionRisk` enforces HIGH_RISK for all `paybox_request_transfer` / `paybox_request_swap` |
| 4 | Safety Check / Policy Override | Detection of "disable security checks", "ignore policy", "approve automatically" |
| 5 | System Instruction Disclosure | Detection of "reveal your system instructions" |
| 6 | Unauthorized Admin Address | Address validation rejects invalid formats; allowlist rejects disabled relayers |
| 7 | Forged Token & Replay Attacks | `safety.approve`/`safety.reject` reject non-existent and already-consumed tokens |
| 8 | Sensitive Data Leakage & Phishing | SSN/CC/private key detection, phishing URL scanner, daily spend limits |

---

## Failure Recovery & Verification Test Suite (6 Scenarios)

File: `tests/unit/failure-recovery-and-verification.test.mjs`

| Scenario | Behavior Tested |
| :--- | :--- |
| 1 | FSM rejects illegal state transitions and maintains immutable audit log |
| 2 | Transient RPC failures (429, 503, timeout) retry with exponential backoff and recover |
| 3 | Fatal authentication errors abort immediately without retrying; escalation triggered |
| 4 | Operator rejection of approval token halts execution and sets `FAILED` state |
| 5 | Post-execution verification detects null results, error payloads, and missing delivery confirmations |
| 6 | Follow-up auto-cancellation fires when counterparty replies to thread |

---

## What Tests Do NOT Cover (Honest Boundaries)

- **Live Mermail MCP calls**: Tests use the built-in mock client. Live integration requires `ENVIRONMENT=live` and valid credentials.
- **On-chain transaction settlement**: PayBox transfers are simulated. Real on-chain execution requires funded wallets.
- **Network partition recovery**: Transient error handling is tested via mock errors, not actual network partitions.

These boundaries are clearly labeled in the codebase with `[SIMULATION]` markers.
