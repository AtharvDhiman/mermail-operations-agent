# Mermail Autonomous Operations Agent: Architecture Specification

## Overview

The **Mermail Autonomous Operations Agent** is an enterprise-grade agent system built around the official Mermail platform and Streamable HTTP Model Context Protocol (MCP). It bridges untrusted incoming communication channels with verified task planning, deterministic finite state machines, multi-chain Web3 treasury operations, and dual-control human authorization.

```
EMAIL / MESSAGE ➔ INTENT UNDERSTANDING ➔ TASK PLANNING ➔ ACTION EXECUTION ➔ VERIFICATION ➔ FOLLOW-UP ➔ FINAL REPORT
```

---

## High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Ingestion ["1. Ingestion & Security Quarantine"]
        EMAIL[Inbound Email via Mermail MCP] --> SEC[Anti-Prompt-Injection Scanner]
        SEC -->|Pattern Detected| QUAR[Quarantine & Critical Security Escalation]
        SEC -->|Clean Content| TRI[Intelligent Inbox Triage]
    end

    subgraph Analysis ["2. Intent & Thread Intelligence"]
        TRI --> CONF[Confidence Scorer & Explanation]
        TRI --> THREAD[Thread Chronology & Commitment Extractor]
        THREAD --> CONTRA{Contradiction Detector}
        CONTRA -->|Conflict Found| FLAG[Flag Contradiction & Alert Operator]
        CONTRA -->|Consistent| ROUTE{Specialized Mode Router}
        ROUTE -->|Customer Bug / Issue| M_SUP[Support Engine]
        ROUTE -->|Lead / Pricing / Demo| M_GTM[Sales & GTM Engine]
        ROUTE -->|Meeting / Reschedule| M_SCHED[Scheduling Engine]
        ROUTE -->|Low Gas / Relayer Alert| M_OPS[General & Treasury Ops Engine]
    end

    subgraph Planning ["3. Autonomous Task Planner"]
        M_SUP & M_GTM & M_SCHED & M_OPS --> PLAN[DAG Step Decomposition]
        PLAN --> RISK{Action Risk Evaluation}
        RISK -->|SAFE: Read/Draft| WORKFLOW[Workflow State Machine]
        RISK -->|HIGH_RISK: Send/Transfer| GATE[Dual-Control Safety Gate]
        GATE --> TOKEN[Generate Cryptographic APPR-XXXX Token]
        TOKEN --> OPERATOR((Human Operator))
        OPERATOR -->|Approve via CLI/UI| WORKFLOW
    end

    subgraph Execution ["4. Execution & Mermail MCP"]
        WORKFLOW --> IDEM[Idempotency Guard - SHA-256]
        IDEM --> CLIENT[Mermail Client]
        CLIENT -->|save_draft / reply_to_email| MAILBOX[Mermail Inbox]
        CLIENT -->|paybox_request_transfer| PAYBOX[Agent Wallet / PayBox]
        MAILBOX & PAYBOX --> VERIFY[Step Verification & Checkpoint]
    end

    subgraph Persistence ["5. Memory, Follow-Up & Audit"]
        VERIFY --> FUP[Persistent Follow-Up Engine]
        FUP -->|Day 0/3/7 Cadence & Auto-Cancel on Reply| DISPATCH[Follow-Up Ping / Resolution]
        VERIFY --> MEM[Persistent Memory - Zero Secrets]
        VERIFY --> AUDIT[Immutable Audit Log - JSONL]
    end
```

---

## 11-Step Finite State Machine

Every task is governed by an explicit finite state machine persisted in `data/memory.json`:

1. **`RECEIVED`**: Inbound email discovered in Mermail mailbox via `list_emails`.
2. **`CLASSIFIED`**: Triaged into one of the 4 modes (`SUPPORT`, `SALES_GTM`, `SCHEDULING`, `GENERAL_OPS`) with urgency and priority.
3. **`PLANNED`**: Decomposed into an ordered directed acyclic graph (DAG) of atomic steps.
4. **`WAITING_APPROVAL`**: Suspended before high-impact operations pending dual-control authorization.
5. **`EXECUTING`**: Invoking tools sequentially with exponential backoff for transient failures.
6. **`VERIFYING`**: Confirming outputs against step-level verification criteria.
7. **`WAITING_FOR_REPLY`**: Suspended awaiting counterparty response with active follow-up cadence.
8. **`FOLLOW_UP_REQUIRED`**: Triggered when follow-up timer expires without reply.
9. **`COMPLETED`**: Terminal success state; summary reported to operator.
10. **`FAILED`**: Step failure after exhaustion of safe retry limits.
11. **`ESCALATED`**: Halted for human intervention with structured 4-part Executive Brief.

---

## Modular Component Breakdown

| Module | File | Responsibility |
| :--- | :--- | :--- |
| **Orchestrator** | `src/operations-agent.js` | Coordinates triage, planning, execution, and Mermail tool calls. |
| **Triage Engine** | `src/triage.js` | Categorizes intent, urgency, deadlines, entities, and required actions. |
| **Confidence Scorer** | `src/confidence.js` | Quantifies confidence (0-100%) and generates concise non-fluff rationales. |
| **Task Planner** | `src/planner.js` | Deconstructs goals into DAG steps, tags risk levels, and assigns tools. |
| **Thread Intelligence** | `src/threads.js` | Reconstructs chronology, extracts commitments, and detects contradictions. |
| **Safety Engine** | `src/safety.js` | Enforces dual-control approval tokens (`APPR-XXXX`), previews, and prompt defense. |
| **Email Composer** | `src/composer.js` | Generates non-robotic, context-aware email responses with clear CTAs. |
| **Follow-Up Engine** | `src/followup.js` | Manages Day 0/3/7 follow-up cadences and auto-cancels on inbound reply. |
| **Memory Engine** | `src/memory.js` | Persists task states, contact preferences, and entity caches on disk. |
| **Idempotency Guard**| `src/idempotency.js` | Deterministic SHA-256 keys preventing duplicate email sends or transfers. |
| **Audit Trail** | `src/audit.js` | Immutable, append-only JSONL log of every agent action and tool call. |
| **Specialized Modes** | `src/modes/` | Mode-specific policies for Support, Sales/GTM, Scheduling, and Web3 General Ops. |
| **x402 Engine** | `src/x402.js` | Recognizes HTTP 402 paywalls and prepares safe dual-control payments. |
| **Developer CLI** | `bin/cli.js` | Full command-line interface (`doctor`, `triage`, `plan`, `run`, `approve`, `demo`). |
| **Web Server & UI** | `src/server.js` | Real-time SSE streaming, REST API, and interactive operator dashboard. |
