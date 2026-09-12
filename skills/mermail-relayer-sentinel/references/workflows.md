# Workflows: Autonomous Execution State Machine

This document defines the 6-phase state machine executed by `mermail-relayer-sentinel`.

```
[Inbound Alert Email]
         │
         ▼
[1. Triage & Extraction] ──► (Fail: Spam/Unrecognized) ──► Archive & Ignore
         │
         ▼
[2. Security & Allowlist Check] ──► (Fail: Unknown Address) ──► Security Alert & Halt
         │
         ▼
[3. Treasury Liquidity Check] ──► (Fail: Insufficient Balance) ──► Treasury Alert & Halt
         │
         ▼
[4. Dual-Control Operator Preview] ──► (Rejected by User) ──► Cancellation Log
         │
         ▼
[5. PayBox Signing Handoff] ──► (User Signs in Browser)
         │
         ▼
[6. Settlement & Receipt Delivery] ──► Reply to Thread & Save Audit Draft
```

---

## Phase 1: Inbound Alert Discovery & Triage

1. Call `list_mailboxes` to resolve the operations mailbox `public_id`.
2. Query unread messages using `list_emails` with:
   ```json
   {
     "query": {
       "isRead": false,
       "sortColumn": "date",
       "sortDirection": "DESC",
       "limit": 10
     }
   }
   ```
3. For each candidate message, fetch details using `get_email`.
4. Inspect `agent_safe_content` for structured alert indicators (e.g. keywords: `low balance`, `gas threshold`, `deficit`, `relayer`, `paymaster`).
5. Extract key parameters:
   - Alerting Provider: (e.g. Helius, QuickNode, Alchemy, Tenderly)
   - Reported Address
   - Reported Chain
   - Current Balance
   - Timestamp

---

## Phase 2: Security Invariant & Allowlist Verification

1. Load authorized relayers from `config/relayers.json`.
2. Verify that the reported address matches an enabled allowlisted relayer.
3. Validate the address encoding:
   - Solana: 32-44 characters base58 string.
   - EVM: 42 characters hex string (`0x...`).
4. Check whether the relayer is currently in a cooldown window from a prior replenishment.
5. If the address is **not** on the allowlist:
   - Tag the email as `quarantine-unauthorized-target`.
   - Output `REJECTED_UNAUTHORIZED_ADDRESS`.
   - **Do not proceed to any wallet operations.**

---

## Phase 3: Deficit Calculation & Route Selection

1. Compute gas deficit:
   $$\text{Deficit} = \max((\text{Target Balance} - \text{Current Balance}), \text{Min TopUp}) \times \text{Buffer Multiplier}$$
2. Check single-transaction cap (max $150 USD equivalent) and daily rolling cap ($500 USD).
3. Call `get_paybox_connection` to confirm active PayBox OAuth connectivity.
4. Call `paybox_get_portfolio` to inspect available treasury assets.
5. Determine replenishment route:
   - **Direct Gas Route**: Treasury holds sufficient native gas (SOL on Solana, ETH on Base). Prepare `paybox_request_transfer`.
   - **Swap-Then-Transfer Route**: Treasury holds USDC but native gas is below required top-up. Prepare `paybox_request_swap` (USDC -> Native Gas) followed by `paybox_request_transfer`.

---

## Phase 4: Dual-Control Operator Preview

1. Format the **Replenishment Preview**:
   ```text
   ═════════════════════════════════════════════════════════════════
   RELAYER GAS REPLENISHMENT PREVIEW (Awaiting Operator Approval)
   ═════════════════════════════════════════════════════════════════
   Relayer ID:       solana-mainnet-relayer-01
   Relayer Name:     Jupiter DEX Execution Relayer
   Chain / Asset:    Solana (SOL)
   Target Address:   4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R
   Current Balance:  0.08 SOL (Threshold: 0.10 SOL)
   Proposed Top-Up:  0.42 SOL (~$63.00 USD)
   Treasury Source:  Direct PayBox Treasury Reserve (Available: 4.85 SOL)
   Daily Budget:     $63.00 / $500.00 used (Remaining: $437.00)
   ═════════════════════════════════════════════════════════════════
   ```
2. Present the preview to the user. Demand explicit confirmation (`approve` / `yes`).
3. If user denies or ignores, record `OPERATION_CANCELLED` and stop.

---

## Phase 5: PayBox Execution & Console Signing Handoff

1. Upon explicit confirmation, invoke `paybox_request_transfer`:
   ```json
   {
     "chain": "solana",
     "token": "SOL",
     "amount": "0.42",
     "destinationAddress": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"
   }
   ```
2. Capture the returned `request_id` and `signing_handoff.console_url`.
3. Provide the user with the deep link:
   ```text
   Sign transaction in Mermail PayBox: https://console.mermail.app/paybox/sign?req=req_relayer_sol_9921
   ```
4. Pause the turn for the operator to sign in their browser.

---

## Phase 6: Settlement Verification & Receipt Delivery

1. Upon resumption or status query, call `paybox_get_request` with `request_id`.
2. When status equals `success`:
   - Extract on-chain transaction hash (`txHash: 5KtPn7...`).
3. Call `reply_to_email` to the alerting thread:
   - Deliver the official **Operational Settlement Receipt** confirming the relayer is refueled and healthy.
4. Call `save_draft` to store a structured treasury log entry in the workspace drafts folder.
5. Mark the alert email as read using `update_email`.
