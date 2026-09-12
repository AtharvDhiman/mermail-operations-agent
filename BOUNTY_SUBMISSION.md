# Superteam Earn Bounty Submission Kit

Bounty Listing: https://superteam.fun/earn/listing/build-and-demo-a-mermail-agent-skill  
Submitted Skill: `mermail-relayer-sentinel`  

---

## Submission Form Responses

### 1. Submission Title
```text
Mermail Relayer Sentinel — Web3 Relayer Gas Monitoring & PayBox Treasury Rebalancing
```

### 2. Short Description of the Skill
```text
Mermail Relayer Sentinel is an infrastructure agent skill that monitors Mermail inboxes for Web3 execution relayer and paymaster gas deficit alerts (from Helius, Tenderly, or custom RPC watchdogs). It validates recipient addresses against a strict static allowlist, enforces rolling 24-hour spend limits, evaluates treasury liquidity via Mermail PayBox, produces an operator-confirmed replenishment proposal, and executes on-chain disbursements with verifiable receipts returned to the email thread. Includes a live web management dashboard with real-time on-chain RPC balance checking.
```

### 3. AI Client Used
```text
Claude Code, Codex, Cursor, and OpenClaw via Mermail's hosted MCP server (https://console.mermail.app/mcp).
```

### 4. Link to Public Pull Request
```text
https://github.com/Nudgen-Marketing/mermail-skills/pull/[YOUR_PR_NUMBER]
```

### 5. Link to Standalone Codebase
```text
https://github.com/[YOUR_GITHUB_HANDLE]/mermail-relayer-sentinel
```

### 6. Link to Video Demo
```text
https://x.com/[YOUR_HANDLE]/status/[YOUR_TWEET_ID]
```

---

## Key Technical Highlights

1. **Practical Web3 Infrastructure**: Addresses relayer gas starvation for protocols running execution bots on Solana and Base.
2. **PayBox Integration**: Uses Mermail's native Agent Wallet / PayBox MCP tools (`get_paybox_connection`, `paybox_get_portfolio`, `paybox_request_transfer`, `paybox_request_swap`) for dual-control signing handoffs.
3. **Defense-in-Depth**:
   - Inbound email content cannot set destination addresses or modify spend parameters.
   - Solana Base58 and EVM EIP-55 address validation prevents malformed address injection.
   - Multi-tier spend caps limit single-transaction and 24-hour aggregate outflows.
4. **Live Management Console**: Native web UI on `http://localhost:3333` with real-time SSE event streaming, live on-chain RPC balance lookups, and allowlist editing.
5. **Upstream Compatibility**: Passes all tests in the official `Nudgen-Marketing/mermail-skills` test suite (17 skills and 71 business tools validated).
