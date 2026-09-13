# Mermail Operations Agent — Demonstration Video Specification

**Project**: Mermail Operations Agent  
**Bounty**: Superteam Earn — Build and Demo a Mermail Agent Skill  
**Live Application**: [https://mermail-operations-agent.onrender.com/](https://mermail-operations-agent.onrender.com/)  
**GitHub Repository**: [https://github.com/AtharvDhiman/mermail-operations-agent](https://github.com/AtharvDhiman/mermail-operations-agent)  
**Deliverable File**: `mermail-agent-skill-demo.mp4` (Duration: 3m 03s | Resolution: 1080p 1920x1080)  
**Thumbnail**: `video/thumbnail.png` (1920x1080)

---

## 1. Video Structure & Scene Breakdown

| # | Scene ID | Title | Start | End | Duration | Visual Description |
|---|---|---|---|---|---|---|
| **01** | `scene01_intro` | Introduction & Live Deployment | 00:00 | 00:15 | 15.70s | Hero portal view, animated radar status, multi-chain ticker, 107/107 tests counter, smooth scroll to Workbench. |
| **02** | `scene02_problem` | Traditional vs Mermail Architecture | 00:15 | 00:33 | 17.35s | Comparison diagram: Fragile regex/blind LLM tools vs Mermail multi-step DAG orchestrator with mandatory dual control. |
| **03** | `scene03_mermail` | Mermail Communication Layer | 00:33 | 00:47 | 14.02s | Workbench view inspecting mailbox identity `mbx_ops_sentinel_01`, relayer gas balances on Solana and Base. |
| **04** | `scene04_modes` | Four Specialized Agent Modes | 00:47 | 01:05 | 18.62s | Visual walkthrough of the 4 modes: Meeting Scheduler, Sales Lead Qualifier, Customer Support Triage, Relayer Sentinel. |
| **05** | `scene05_scenario` | Executing Autonomous Scenario | 01:05 | 01:22 | 16.82s | Triggering Solana relayer deficit scenario (`0.14 SOL`), agent triages as `GENERAL_OPS (P0)` and initiates loop. |
| **06** | `scene06_dag` | Dynamic DAG Planning | 01:22 | 01:35 | 13.06s | Separation of concerns: discrete DAG steps for context ingestion, policy validation, dual-control gate, and settlement. |
| **07** | `scene07_security` | Policy Engine & Safety Invariants | 01:35 | 01:48 | 12.77s | Invariant checks: Prompt injection scan PASSED, allowlist verified, daily budget $250 cap, emergency circuit breaker. |
| **08** | `scene08_approval` | Human Dual-Control Approval Gate | 01:48 | 02:05 | 17.02s | Execution halts at approval gate with 128-bit cryptographic token. Operator reviews details and clicks Authorize. |
| **09** | `scene09_settlement` | PayBox Settlement & Verification | 02:05 | 02:16 | 11.33s | Agent resumes execution, PayBox settlement completes, transaction receipt verified, relayer balance replenished. |
| **10** | `scene10_audit` | Append-Only Audit Trail & Logs | 02:16 | 02:27 | 10.94s | Real-time SSE stream events and immutable audit log showing cryptographic signatures, actor, and outcome. |
| **11** | `scene11_skillmd` | Standardized SKILL.md Deliverable | 02:27 | 02:38 | 10.82s | Reusable Agent Skill specification in `skills/mermail-operations-agent/SKILL.md` compatible with OpenClaw. |
| **12** | `scene12_tests` | Production Quality: 107 Tests | 02:38 | 02:50 | 11.59s | Automated test results: 107 tests passing across 42 suites, including dedicated security regression testing. |
| **13** | `scene13_conclusion` | Summary & Links | 02:50 | 03:03 | 13.61s | Architecture summary, 4 core pillars, live deployment URL, and GitHub repository link. |

---

## 2. Complete Voiceover Narration Script

- **Scene 01 (00:00 - 00:15)**:  
  *"This is the Mermail Operations Agent, live in production. Mermail provides our autonomous agent with an operational communication layer, while our Agent Skill turns incoming decentralized messages into secure, multi-step operations."*

- **Scene 02 (00:15 - 00:33)**:  
  *"Traditional email automation is rigid and brittle—blindly triggering actions from simple keywords. Mermail Operations Agent treats inbound communications as untrusted events, orchestrating end-to-end operational workflows with formal safety controls."*

- **Scene 03 (00:33 - 00:47)**:  
  *"Mermail gives the agent a dedicated mailbox identity. The Agent Skill continuously ingests incoming messages, checks thread context, and monitors on-chain relayer gas reserves via native RPC."*

- **Scene 04 (00:47 - 01:05)**:  
  *"The same underlying architecture powers four specialized operational modes: Automated Meeting Scheduling with calendar constraints, Sales Lead Qualification with ICP scoring, Customer Support ticket triage, and our primary Relayer Sentinel mode for automated Web3 gas monitoring."*

- **Scene 05 (01:05 - 01:22)**:  
  *"Let's trigger an autonomous operations scenario. The agent ingests an urgent alert reporting a Solana relayer balance deficit. It classifies the message as a Priority Zero operational incident and autonomously builds a four-step execution DAG."*

- **Scene 06 (01:22 - 01:35)**:  
  *"Instead of allowing an LLM to directly execute actions, the skill separates planning, policy validation, execution, and verification into discrete, idempotent steps."*

- **Scene 07 (01:35 - 01:48)**:  
  *"Every message is scanned for adversarial prompt injection. Unallowlisted addresses are rejected, and disbursements are bound by a rolling daily budget cap and an instant emergency circuit breaker."*

- **Scene 08 (01:48 - 02:05)**:  
  *"Here is the core safety invariant: human dual-control. Before any financial disbursement or external email is dispatched, execution halts at an approval gate. The operator reviews the 128-bit cryptographic token and approves the transfer."*

- **Scene 09 (02:05 - 02:16)**:  
  *"Upon operator authorization, the agent resumes execution, settles the transfer through the PayBox gateway, verifies the transaction receipt, and completes the workflow."*

- **Scene 10 (02:16 - 02:27)**:  
  *"Every single decision, state transition, and operator intervention is recorded in an append-only audit trail, ensuring complete operational transparency."*

- **Scene 11 (02:27 - 02:38)**:  
  *"The core deliverable is a standardized, reusable Mermail Agent Skill defined in SKILL.md—compatible with any agent framework that supports Mermail."*

- **Scene 12 (02:38 - 02:50)**:  
  *"Reliability is verified by an automated test suite: 107 unit and security regression tests passing across 42 suites with a 100 percent pass rate."*

- **Scene 13 (02:50 - 03:03)**:  
  *"Mermail provides the communication layer. Our Agent Skill turns that communication into secure, auditable, multi-step autonomous operations. Mermail Operations Agent—built for Superteam Earn."*

---

## 3. YouTube Metadata (Ready to Paste)

### Title:
**Mermail Operations Agent — Autonomous Web3 Ops, Dual-Control & PayBox Settlement (Superteam Bounty Demo)**

### Description:
```markdown
Autonomous Operations Agent built for the Superteam Earn "Build and Demo a Mermail Agent Skill" bounty.

Mermail Operations Agent turns incoming decentralized email communications into secure, multi-step autonomous operations. Built on Mermail MCP tools, the agent ingests messages, executes adversarial prompt injection defenses, builds dynamic DAG execution plans, halts at cryptographic human-in-the-loop dual-control gates, and settles on-chain relayer gas replenishment through the PayBox gateway.

🌐 Live Application: https://mermail-operations-agent.onrender.com/
📂 GitHub Repository: https://github.com/AtharvDhiman/mermail-operations-agent
📜 SKILL.md Specification: https://github.com/AtharvDhiman/mermail-operations-agent/blob/main/skills/mermail-operations-agent/SKILL.md

TIMESTAMPS:
00:00 - Introduction & Live Deployment
00:15 - The Problem: Brittle Email Automation vs Verified DAG Agent
00:33 - Mermail Ingestion Layer & Relayer Gas Monitoring
00:47 - Four Specialized Agent Modes (Ops, Support, Sales, Scheduling)
01:05 - Executing Autonomous Scenario: Solana Relayer Deficit
01:22 - Separation of Concerns: Planning, Policy, Execution & Verification
01:35 - Adversarial Prompt Injection Defense & Security Invariants
01:48 - Mandatory Human Dual-Control Gate (128-bit Cryptographic Token)
02:05 - PayBox Settlement & Transaction Verification
02:16 - Append-Only Immutable Audit Trail & SSE Streaming Logs
02:27 - Standardized Reusable SKILL.md Deliverable
02:38 - Production Quality: 107 Automated Tests Verified (100% Pass)
02:50 - Summary & Technical Architecture

CORE TECHNICAL INNOVATIONS:
1. Reusable Mermail Agent Skill: Standards-compliant SKILL.md specification compatible with OpenClaw and external agent runtimes.
2. Cryptographic Dual-Control: High-risk actions (financial movement and external outbound emails) are gated behind 128-bit approval tokens.
3. Separation of Concerns: Strict decoupling of prompt triage, DAG planning, invariant verification, tool execution, and audit logging.
4. Comprehensive Testing: 107 automated tests across 42 suites verifying state machine transitions, invariants, and security regression defenses.

Built with Node.js, Express, Mermail MCP, Solana RPC, Base RPC, PayBox Treasury Gateway, Playwright, and FFmpeg.
```

---

## 4. Superteam Earn Submission Form Text

### Short Description / Pitch:
> **Mermail Operations Agent** is an autonomous operational backbone for Web3 teams. It connects decentralized communication via Mermail to real-world operations: monitoring on-chain relayer balances, triaging inbound communications, orchestrating multi-step DAG workflows, enforcing human-in-the-loop dual-control authorization with 128-bit tokens, and settling fund replenishments via PayBox. Built with a reusable SKILL.md specification and verified by 107 automated unit and security regression tests.

### Key Deliverables:
- **Demo Video (1080p, 3:03)**: `mermail-agent-skill-demo.mp4`
- **Live Deployment**: `https://mermail-operations-agent.onrender.com/`
- **GitHub Repository**: `https://github.com/AtharvDhiman/mermail-operations-agent`
- **Reusable SKILL.md**: `skills/mermail-operations-agent/SKILL.md`
- **Automated Test Suite**: 107 tests passing across 42 test suites (`npm test` / `npm run validate`)
