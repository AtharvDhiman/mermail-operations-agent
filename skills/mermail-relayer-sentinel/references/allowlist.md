# Allowlist Schema & Relayer Governance

The `mermail-relayer-sentinel` enforces strict allowlist checks before considering any wallet movement.

## Configuration Schema (`config/relayers.json`)

The allowlist is stored in a structured JSON document:

```json
{
  "version": "1.0.0",
  "policy": {
    "maxDailyTopUpUsd": 500.0,
    "maxSingleTopUpUsd": 150.0,
    "requireHumanConfirmation": true,
    "defaultGasBufferMultiplier": 1.25,
    "allowlistedChains": ["solana", "base", "ethereum"]
  },
  "relayers": [
    {
      "id": "solana-mainnet-relayer-01",
      "name": "Jupiter DEX Execution Relayer",
      "chain": "solana",
      "token": "SOL",
      "address": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
      "minThreshold": 0.10,
      "targetBalance": 0.50,
      "maxSingleTopUp": 1.00,
      "alertEmailSender": "alerts@helius.dev",
      "enabled": true
    }
  ]
}
```

## Field Definitions

- `policy.maxDailyTopUpUsd`: Global 24-hour limit across all relayers.
- `policy.maxSingleTopUpUsd`: Cap on any individual top-up proposal.
- `policy.requireHumanConfirmation`: Boolean flag requiring interactive operator approval.
- `relayers[].id`: Unique identifier for the relayer.
- `relayers[].address`: Cryptographic public key (Solana Base58 or EVM 0x).
- `relayers[].minThreshold`: Balance level that triggers automated replenishment triage.
- `relayers[].targetBalance`: Desired operational buffer balance after replenishment.
- `relayers[].alertEmailSender`: Expected sender email for alerts (e.g. `alerts@helius.dev`, `notify@tenderly.co`). Alerts from unknown senders are flagged for inspection.
- `relayers[].enabled`: Administrative kill switch to disable automated replenishment for specific bots.
