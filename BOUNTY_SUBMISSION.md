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

1. **Practical Web3 Infrastructure**: Addresses relayer and paymaster gas starvation for decentralized applications and protocols running execution bots on Solana, Base, and Ethereum.
2. **Comprehensive Mermail Tool Orchestration**: Uses both Mermail Inbox MCP tools (`list_emails`, `read_email`, `reply_to_email`, `save_draft`) and PayBox / Agent Wallet tools (`get_paybox_connection`, `paybox_get_portfolio`, `paybox_request_transfer`, `paybox_request_swap`) with dual-control signing deep-links.
3. **Web3 Wallet Integration**: Connects real browser wallets (Phantom, Solflare, MetaMask) or Mermail PayBox treasury directly in the UI, displaying live on-chain balances and acting as the human operator signer.
4. **Defense-in-Depth & Prompt-Injection Neutralization**:
   - Inbound email text cannot alter destination addresses or override spend caps.
   - Solana Base58 and EVM address format validation prevents malformed injection attacks.
   - Strict static allowlist and daily spend limits protect treasury reserves.
5. **Autonomous Watchdog & Live Telemetry**: Background on-chain poller that actively monitors relayers and streams live Solana slot/epoch counters and Base Gwei gas prices.
6. **Live Operations Platform**: Luxury dark Web3 console running on `http://localhost:3333` with real-time SSE streaming, instant manual top-ups, external webhook dispatches, and CSV audit exports.
7. **100% Upstream & Test Suite Validation**: Passes all tests in the official `Nudgen-Marketing/mermail-skills` test suite (17 skills, 71 tools validated) and 18/18 automated unit and integration tests.

