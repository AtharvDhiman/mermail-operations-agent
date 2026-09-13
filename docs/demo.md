# Mermail Autonomous Operations Agent: Judge Demo Guide

This guide is designed for Superteam Earn bounty judges to run, inspect, and evaluate the project within 60 seconds with zero manual configuration.

---

## 60-Second Quickstart (Zero Configuration)

```bash
# 1. Clone repository
git clone https://github.com/username/mermail-operations-agent.git
cd mermail-operations-agent

# 2. Run the deterministic judge demo
npm run demo
```

The demonstration will output a complete 8-phase operational lifecycle in under 60 seconds.

---

## Recommended Video Demonstration Sequence (2–5 Minutes)

When recording your demo video for submission to Superteam Earn and X (tagging [@Mermailapp](https://x.com/Mermailapp)), follow this exact sequence:

### 1. Problem & Introduction (0:00 – 0:45)
- Explain the limitation of shallow "email bots" that simply forward or hallucinate replies.
- Introduce the **Mermail Autonomous Operations Agent**: a true multi-step operational agent powered by Mermail Inbox & Agent Wallet / PayBox.
- Show the architecture diagram from `docs/architecture.md`:
  `EMAIL ➔ TRIAGE ➔ PLANNING ➔ SAFETY GATE ➔ EXECUTE ➔ FOLLOW-UP ➔ AUDIT`

### 2. Live CLI Demonstration: `mermail-agent demo` (0:45 – 2:00)
- Run `node bin/cli.js demo`.
- Walk the viewer through the live terminal output:
  - **Phase 1**: Inbound email arrival & intelligent triage (category, priority, 90%+ confidence score).
  - **Phase 2**: Thread intelligence & contradiction check.
  - **Phase 3**: Task planner generating the 4-step DAG.
  - **Phase 4**: Dual-control safety gate pausing at high-risk step and generating token `APPR-XXXX`.
  - **Phase 5**: Operator approval & live Mermail MCP execution (`save_draft`, `reply_to_email`).
  - **Phase 6**: Follow-up cadence registered, and auto-cancelled upon simulated counterparty reply.
  - **Phase 7**: Prompt injection attack email ingested, quarantined, and escalated with zero secret leakage.
  - **Phase 8**: Immutable audit trail and structured logging.

### 3. Interactive Web Dashboard (2:00 – 3:15)
- Open `http://localhost:3333` in your browser.
- Show:
  - **Triage Feed**: Live message triage with confidence badges.
  - **Active Task Planner**: Visual step DAG and FSM states.
  - **Approvals Center**: 1-click Approve / Reject for high-risk actions.
  - **Follow-Up Queue**: Multi-day cadence tracker.
  - **Audit Stream**: Real-time event log.

### 4. Code Quality, Test Suite & Upstream Standards (3:15 – 4:00)
- Run `npm test` in the terminal:
  - Show 97/97 tests passing across 42 suites (triage, confidence, planner, FSM, thread contradictions, approvals, x402, followup, security, red-team, failure-recovery, lifecycle).
- Run `npm run test:skill`:
  - Show 100% compliance with Mermail Skills standards (<500 lines, YAML frontmatter, official tools only) for both `mermail-operations-agent` and `mermail-relayer-sentinel`.
- Conclude by highlighting that all functionality runs locally out-of-the-box with zero paid API keys or crypto funds required.

---

## Interactive CLI Commands for Live Testing

Judges can explore individual components interactively:

```bash
# System Health Check (with JSON flag support)
node bin/cli.js doctor
node bin/cli.js doctor --json

# View current messages in Mermail Inbox
node bin/cli.js inbox

# Triage specific email
node bin/cli.js triage email_sched_01
node bin/cli.js triage email_sales_01
node bin/cli.js triage email_alert_hel_01

# Test simulated inbound email scenarios with built-in presets
node bin/cli.js test-email --preset sales
node bin/cli.js test-email --preset support
node bin/cli.js test-email --preset scheduling
node bin/cli.js test-email --preset x402
node bin/cli.js test-email --preset gas_alert
node bin/cli.js test-email --preset injection

# Generate autonomous DAG plan
node bin/cli.js plan

# Run workflow up to safety gate
node bin/cli.js run

# Authorize pending token
node bin/cli.js approve <TOKEN>

# Inspect active follow-ups or advance simulation time
node bin/cli.js followups
node bin/cli.js followups --advance-days 3

# Inspect immutable audit trail with filters
node bin/cli.js audit
node bin/cli.js audit --limit 10 --status SUCCESS --actor AGENT:AUTONOMOUS
node bin/cli.js audit --json
```
