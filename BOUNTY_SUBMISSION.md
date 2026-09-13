# Superteam Earn Bounty Submission Kit

- **Bounty Listing**: [Build and Demo a Mermail Agent Skill](https://superteam.fun/earn/listing/build-and-demo-a-mermail-agent-skill)
- **Primary Submitted Skill**: `mermail-operations-agent`
- **Specialized Web3 Infrastructure Skill**: `mermail-relayer-sentinel`
- **Test Status**: 97/97 Tests Passing (42 Test Suites) · 100% Mermail Skills Specification Compliant

---

## Submission Form Responses

### 1. Submission Title
```text
Mermail Autonomous Operations Agent — Multi-Mode Autonomous Workforce & Web3 Treasury Sentinel
```

### 2. Short Description of the Skill
```text
Mermail Autonomous Operations Agent transforms an AI agent's Mermail inbox and Agent Wallet into an enterprise-grade autonomous workforce. Operating across 4 specialized modes (Scheduling, Sales/GTM, Customer Support, and Web3 General Ops / Relayer Sentinel), the agent ingests communications, triages intent, reconstructs threads with contradiction detection, plans verified DAG workflows, pauses at dual-control cryptographic safety gates (APPR-XXXX) before external communications or PayBox disbursements, manages persistent multi-day follow-up cadences with automatic reply cancellation, and enforces an anti-prompt-injection zero-secrets security invariant. Includes an interactive Web Management Console (localhost:3333) and a full developer CLI.
```

### 3. AI Client Used
```text
Claude Code, Codex, Cursor, and OpenClaw via Mermail's hosted MCP server (https://console.mermail.app/mcp) and local deterministic MCP fixtures.
```

### 4. Link to Public Pull Request
```text
https://github.com/Nudgen-Marketing/mermail-skills/pull/[YOUR_PR_NUMBER]
```

### 5. Link to Standalone Codebase
```text
https://github.com/[YOUR_GITHUB_HANDLE]/mermail-operations-agent
```

### 6. Link to Video Demo
```text
https://x.com/[YOUR_HANDLE]/status/[YOUR_TWEET_ID]
```

---

## Differentiating Architecture & Superteam Criteria Alignment

### Why This Is Not Just Another Shallow Email Wrapper
Most AI email tools are single-prompt wrappers: they ingest an email, hallucinate an immediate reply, and fire it off without verification.

The **Mermail Autonomous Operations Agent** implements authentic agentic autonomy:
1. **Inbox as an Operational Nervous System**: Ingests calendar requests, enterprise sales leads, customer bug tickets, and on-chain relayer alerts directly from Mermail MCP.
2. **Deterministic Multi-Step DAG Planning**: Deconstructs every intent into atomic ordered steps tagged as `SAFE` (auto-executable read/draft) or `HIGH_RISK` (external sends, financial payouts).
3. **Dual-Control Human Authorization**: Generates cryptographic approval tokens (`APPR-XXXX`) with human-readable impact previews. Execution safely suspends until authorized by a human operator via CLI or the Web Dashboard.
4. **Thread Intelligence & Contradiction Detection**: Reconstructs complete email threads, extracts historical commitments, and identifies price, timeline, or scope contradictions.
5. **Persistent Follow-Up Cadence with Auto-Cancel**: Manages multi-day cadences (Day 0 ➔ Day 3 ➔ Day 7) that automatically cancel the instant an inbound reply is detected, preventing embarrassing email spam.
6. **Web3 PayBox & Agent Wallet Native**: Directly orchestrates Mermail PayBox treasury inspection, multi-chain gas replenishment, and HTTP 402 paywall settlements.
7. **Zero-Secrets & Anti-Prompt-Injection Invariants**: Rigorous input sanitization, instruction hijacking defense, and automatic regex redaction of private keys and API tokens.

---

## Two Production-Ready Skill Packages

| Skill Package | Location | Lines | Focus |
| :--- | :--- | :--- | :--- |
| **`mermail-operations-agent`** | `skills/mermail-operations-agent/SKILL.md` | < 450 lines | General operations workforce: scheduling, sales GTM, customer support, thread contradiction detection, follow-up cadences, and dual-control approval gates. |
| **`mermail-relayer-sentinel`** | `skills/mermail-relayer-sentinel/SKILL.md` | < 430 lines | Web3 execution relayer gas monitoring, PayBox treasury rebalancing, allowlist protection, and on-chain disbursement receipts. |

Both skills strictly conform to `Nudgen-Marketing/mermail-skills` upstream repository standards (valid YAML frontmatter, under 500 lines, official Mermail tools only) and pass `node tests/validate-skill.mjs` with 100% compliance.

---

## 8-Phase Verification Lifecycle (60-Second Demo)

Judges can execute the complete end-to-end operational lifecycle in under 60 seconds with zero configuration or keys:

```bash
npm run demo
```

The demo autonomously showcases:
1. **Intelligent Inbox Triage**: Categorizes intent, urgency, and priority with quantified confidence scores and rationale.
2. **Thread Intelligence**: Reconstructs thread context and extracts commitments without contradiction.
3. **Autonomous DAG Planning**: Deconstructs the goal into 4 atomic steps, segregating safe from high-risk tools.
4. **Human-in-the-Loop Safety Gate**: Pauses execution at Step 3 and generates cryptographic token `APPR-XXXX`.
5. **Operator Sign-Off & MCP Execution**: Operator approves via CLI/Web Console; agent calls `save_draft` and `reply_to_email`.
6. **Persistent Follow-Up & Auto-Cancel**: Registers Day 3/7 cadence, detects simulated counterparty reply, and immediately cancels pending follow-ups.
7. **Anti-Prompt-Injection Defense**: Ingests an adversarial prompt injection attack email, quarantines it, and triggers critical escalation with zero secret leaks.
8. **Immutable Audit Trail**: Streams structured JSONL records of all actions, actors, and outcomes.

---

## Quickstart for Judges

```bash
# 1. Clone & install
git clone https://github.com/[YOUR_GITHUB_HANDLE]/mermail-operations-agent.git
cd mermail-operations-agent
npm install

# 2. Run system doctor diagnostics
npm run doctor

# 3. Run the 60s deterministic judge demo
npm run demo

# 4. Reset the environment cleanly anytime
npm run reset

# 5. Run all 97 tests across 42 suites
npm test

# 6. Verify upstream skill specification compliance
npm run test:skill

# 7. Launch the live interactive Web Dashboard
npm run serve
# Visit http://localhost:3333
```

---

## Interactive CLI Scenarios

Judges can test live simulated emails using built-in presets:

```bash
# Test Enterprise Sales Lead
node bin/cli.js test-email --preset sales

# Test Customer Support Incident
node bin/cli.js test-email --preset support

# Test Meeting Scheduling
node bin/cli.js test-email --preset scheduling

# Test HTTP 402 PayBox Settlement
node bin/cli.js test-email --preset x402

# Test Web3 Relayer Gas Alert
node bin/cli.js test-email --preset gas_alert

# Test Adversarial Prompt Injection Neutralization
node bin/cli.js test-email --preset injection
```


