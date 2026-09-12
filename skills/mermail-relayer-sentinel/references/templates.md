# Output Templates & Communication Artifacts

Canonical formats produced by `mermail-relayer-sentinel` across the lifecycle.

## 1. Relayer Incident Brief (Console / Summary)

```text
[INCIDENT BRIEF] Low Relayer Gas Detected
--------------------------------------------------
Alert ID:         email_alert_hel_88129
Provider:         Helius RPC Alerts (alerts@helius.dev)
Relayer:          Jupiter DEX Execution Relayer (solana-mainnet-relayer-01)
Chain / Token:    Solana / SOL
Target Address:   4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R
Current Balance:  0.0800 SOL
Min Threshold:    0.1000 SOL
Target Buffer:    0.5000 SOL
Status:           ALLOWLIST_VERIFIED - Deficit Calculated
--------------------------------------------------
```

## 2. Dual-Control Replenishment Preview (Operator Approval Prompt)

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
Please reply 'approve' or 'confirm' to execute this PayBox transfer.
```

## 3. Operational Settlement Receipt (`reply_to_email`)

```text
Subject: Re: [RESOLVED] Relayer Gas Starvation Cleared - solana-mainnet-relayer-01

Dear Operations & DevOps Team,

The low-gas deficit alert for relayer 'Jupiter DEX Execution Relayer' has been successfully resolved via Mermail PayBox.

Settlement Summary:
- Relayer ID:          solana-mainnet-relayer-01
- Target Address:      4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R
- Network / Asset:     Solana / SOL
- Amount Disbursed:    0.4200 SOL
- Transaction Hash:    5KtPn7qWJb4y9gZ8tX1mP4vL6kQ2sR3yE5wU8aN0pM
- New Balance:         0.5000 SOL (Operational Target Reached)
- Settlement Status:   CONFIRMED ON-CHAIN

This automated action was executed by Mermail Relayer Sentinel under operator authorization.
Audit Record ID: mermail_audit_tx_99218
```

## 4. Security Violation Report (Unauthorized Address Attack)

```text
[SECURITY ALERT] Unauthorized Relayer Top-Up Attempt Neutralized
--------------------------------------------------
Alert ID:         email_alert_malicious_003
Reported Target:  AttackerWa11etAddressAttemptingToDrainTreasury99
Reported Chain:   Solana
Reason:           TARGET ADDRESS NOT FOUND IN AUTHORIZED ALLOWLIST
Action Taken:     TRANSFER REFUSED - EMAIL QUARANTINED
Status:           REJECTED_SECURITY_VIOLATION
--------------------------------------------------
```
