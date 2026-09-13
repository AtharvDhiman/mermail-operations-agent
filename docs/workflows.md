# Mermail Autonomous Operations Agent: Workflows Guide

This document provides a detailed walkthrough of how each of the 4 specialized operational workflows executes from initial email ingestion to final resolution.

---

## 1. Meeting Scheduling Workflow (`SCHEDULING`)

**Use Case**: A partner or client emails requesting a meeting, reschedule, or calendar availability.

### Execution Flow:
1. **Inbound Email**:
   - Sender: `elena@globalventures.io`
   - Subject: `Reschedule partnership sync`
   - Body: `"Can we move tomorrow's meeting to Friday at 3:00 PM UTC?"`
2. **Intelligent Triage**:
   - Classified as `SCHEDULING` with `MEDIUM` urgency / `P2` priority.
   - Entities: `timeSlot = "3:00 PM"`.
   - Confidence: `90%` (`High confidence: Explicit intent 'Reschedule Meeting' with 1 validated parameter`).
3. **Thread Analysis**:
   - Reconstructs thread context, checks for conflicts with previous commitments.
4. **Task Planning (DAG)**:
   - Step 1: `read_calendar_constraints` (SAFE)
   - Step 2: `save_draft` (SAFE)
   - Step 3: `reply_to_email` (HIGH-RISK)
   - Step 4: `register_followup` (SAFE)
5. **Safety Gate**:
   - Safe steps 1 and 2 execute autonomously.
   - Pauses before Step 3, issuing approval token `APPR-XXXX`.
6. **Operator Sign-Off**:
   - Operator reviews proposal preview and approves via CLI:
     ```bash
     mermail-agent approve APPR-XXXX
     ```
7. **MCP Execution**:
   - Dispatches confirmation reply via `reply_to_email`.
   - Schedules Day 2 follow-up check (`stopOnReply: true`).
8. **Follow-Up Handling**:
   - When Elena responds confirming the time, the follow-up is automatically cancelled.

---

## 2. Customer Support & Incident Workflow (`SUPPORT`)

**Use Case**: A customer reports an integration bug, webhook failure, or API issue.

### Execution Flow:
1. **Inbound Email**:
   - Subject: `Bug: webhook signing timeout error`
   - Body: `"We encountered an error when trying to verify signed webhooks on mainnet. The request times out after 10 seconds."`
2. **Triage & SLA Calculation**:
   - Category: `SUPPORT`.
   - Priority: `P3` (48-hour SLA).
   - Sentiment: `NEUTRAL_INQUIRY`.
3. **Planning & Drafting**:
   - Step 1: `triage_support_issue` (SAFE)
   - Step 2: `save_draft` (SAFE - Contextual troubleshooting draft)
   - Step 3: `reply_to_email` (HIGH-RISK)
   - Step 4: `register_followup` (SAFE - Day 3 satisfaction check)
4. **Approval & Dispatch**:
   - Draft saved in Mermail mailbox.
   - Operator approves response to user.
   - Day 3 satisfaction check follow-up scheduled.

---

## 3. Inbound Sales & GTM Workflow (`SALES_GTM`)

**Use Case**: An inbound enterprise lead requests pricing, demo, or partnership details.

### Execution Flow:
1. **Inbound Email**:
   - Subject: `Enterprise Tier and Treasury API Pricing`
   - Body: `"Our team is deploying a cross-border payment relayer network and looking for an autonomous operations solution. Could you provide enterprise pricing details and schedule a demo?"`
2. **Lead Qualification & ICP Scoring**:
   - Corporate business domain check (+25 points).
   - Scale & enterprise indicators (+20 points).
   - Budget & pricing indicators (+15 points).
   - Result: `Tier 1 Qualified Lead`.
3. **Planning & Outreach**:
   - Step 1: `qualify_lead` (SAFE)
   - Step 2: `save_draft` (SAFE - Personalized enterprise proposal)
   - Step 3: `send_email` (HIGH-RISK - Dual-control sign-off required)
   - Step 4: `register_followup` (SAFE - Day 3 & Day 7 sales cadences)
4. **Follow-Up Automation**:
   - Follow-up check registered in `data/followups.json`.
   - If lead does not reply in 3 days, follow-up ping is queued; if reply arrives, auto-cancels.

---

## 4. Web3 General Ops & Treasury Liquidity Workflow (`GENERAL_OPS`)

**Use Case**: Automated RPC monitoring (Helius/Tenderly) detects a relayer/paymaster below minimum gas threshold.

### Execution Flow:
1. **Inbound Email Alert**:
   - Subject: `[ALERT] Relayer solana-mainnet-relayer-01 below safe threshold`
   - Body: `"Target Address: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R\nCurrent Balance: 0.08 SOL\nMinimum Threshold: 0.10 SOL"`
2. **Triage & Address Verification**:
   - Category: `GENERAL_OPS`, Priority: `P0` (Critical), Urgency: `CRITICAL`.
   - Verified Solana Base58 address against `config/allowlist.json`.
   - Deficit calculation: Target (0.20 SOL) - Current (0.08 SOL) = 0.12 SOL + 25% safety buffer = 0.15 SOL.
3. **Treasury Liquidity Inspection**:
   - Calls `paybox_get_portfolio` to ensure treasury reserves are sufficient.
4. **Human-in-the-Loop Dual-Control Gate**:
   - Generates replenishment proposal and pauses for approval.
   - Operator approves via console link or CLI token.
5. **Execution & Settlement**:
   - Calls `paybox_request_transfer` to sign transaction.
   - Polls `paybox_get_request` to verify terminal on-chain finality.
   - Dispatches operational resolution receipt via `reply_to_email`.
