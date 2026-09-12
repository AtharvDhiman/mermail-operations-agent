# 🛡️ Mermail Relayer Sentinel (`mermail-relayer-sentinel`)

[![Superteam Earn Bounty](https://img.shields.io/badge/Superteam%20Earn-Bounty%20Submission-9945FF?style=flat&logo=solana)](https://superteam.fun/earn/listing/build-and-demo-a-mermail-agent-skill)
[![Mermail Skills Compatible](https://img.shields.io/badge/Mermail%20Skills-100%25%20Verified-00C853?style=flat)](https://github.com/Nudgen-Marketing/mermail-skills)
[![Test Suite](https://img.shields.io/badge/Tests-14%2F14%20Passing-brightgreen?style=flat)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Autonomous Web3 Relayer Gas Monitoring, Deficit Triage, and PayBox Treasury Replenishment Agent Skill for Mermail.**

`mermail-relayer-sentinel` is a specialized, production-grade agent skill designed to eliminate one of Web3's most pervasive reliability risks: **relayer and paymaster gas exhaustion**.

By integrating **Mermail's Hosted MCP server** (inbox monitoring, email parsing, conversation threading) with **Agent Wallet / PayBox** (portfolio discovery, swaps, and on-chain disbursements), Sentinel autonomously detects low gas alerts from monitoring providers (such as Helius, Tenderly, or custom Web3 webhooks), verifies allowlisted contracts against strict zero-trust cryptographic rules, generates dual-control replenishment proposals, and executes audited on-chain top-ups with immutable receipts.

---

## 📑 Table of Contents

- [The Problem: The Relayer Gas Trap](#-the-problem-the-relayer-gas-trap)
- [System Architecture](#-system-architecture)
- [Zero-Trust Security Model](#-zero-trust-security-model)
- [Features & Capabilities](#-features--capabilities)
- [Quickstart & Demo](#-quickstart--demo)
- [Command Line Interface (CLI)](#-command-line-interface-cli)
- [Configuration Schema](#-configuration-schema)
- [Testing & Validation](#-testing--validation)
- [Directory Structure](#-directory-structure)
- [Superteam Bounty Deliverables](#-superteam-bounty-deliverables)

---

## ⚡ The Problem: The Relayer Gas Trap

Modern decentralized applications, cross-chain bridges, and account-abstraction dApps rely on automated execution relayers, bundlers, and paymasters. When high transaction volume hits, relayers burn native gas tokens (SOL, ETH, BASE) at unpredictable rates.

If a relayer's balance falls below minimum gas thresholds:
- User transactions immediately stall or fail.
- Cross-chain messages get stranded in bridge contracts.
- Automated liquidation bots fail to trigger, creating protocol bad debt.
- On-call engineers scramble during off-hours to swap tokens and execute manual treasury transfers.

Existing monitoring solutions (Helius, Tenderly, Alchemy) can send email alerts, but **cannot act**. Simple AI agents that blindly execute payment instructions from inbound emails introduce catastrophic attack surfaces, including prompt injection and treasury draining.

**Mermail Relayer Sentinel solves this with an audited, zero-trust autonomous workflow.**

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Web3 Monitoring Providers
        Helius[Helius Solana Webhooks]
        Tenderly[Tenderly EVM Alerts]
        CustomBot[Internal Watchdog Webhooks]
    end

    subgraph Mermail Inbox
        MBX[Mermail Agent Inbox\n`mbx_ops_sentinel_01`]
        Email[Inbound Deficit Alert]
    end

    subgraph Mermail Relayer Sentinel Agent
        Sanitizer[Prompt-Injection\nFilter & Sanitizer]
        Parser[Cryptographic Address\n& Chain Validator]
        Allowlist[Security Allowlist &\nDaily Budget Tracker]
        Deficit[Deficit Calculus &\nBuffer Optimization]
        Preview[Dual-Control\nProposal Preview]
    end

    subgraph Operator Gate
        Human[Operator Review\n& Authorization]
    end

    subgraph Mermail PayBox / Agent Wallet
        Portfolio[PayBox Portfolio Probe]
        Swap[PayBox Token Swap\n(USDC -> Gas)]
        Transfer[PayBox Native Transfer\n`paybox_request_transfer`]
        Handoff[Signing Console Handoff\n`console_url`]
    end

    subgraph On-Chain Finality
        Solana[Solana Mainnet]
        Base[Base Mainnet]
        Receipt[Cryptographic Settlement Receipt\nEmailed to Incident Thread]
    end

    Helius --> MBX
    Tenderly --> MBX
    CustomBot --> MBX
    MBX --> Email

    Email --> Sanitizer
    Sanitizer --> Parser
    Parser --> Allowlist
    Allowlist --> Deficit
    Deficit --> Portfolio
    Portfolio --> Preview

    Preview --> Human
    Human -- Authorized --> Transfer
    Portfolio -. Short on Gas .-> Swap
    Swap --> Transfer
    Transfer --> Handoff
    Handoff --> Solana
    Handoff --> Base
    Solana --> Receipt
    Base --> Receipt
    Receipt --> MBX
```

---

## 🛡️ Zero-Trust Security Model

Sentinel is built under the fundamental assumption that **any external communication channel is hostile**:

| Attack Vector | Defense Mechanism |
| :--- | :--- |
| **Prompt Injection** | Inbound email text is treated strictly as passive data. Regex neutralization strips override phrases (`"ignore instructions"`, `"transfer funds to"`). |
| **Address Spoofing** | Solana Base58 checksum rules (excluding `0`, `O`, `I`, `l`) and EVM EIP-55 hex checks are enforced before allowlist lookup. |
| **Treasury Draining** | Inbound emails **NEVER** select payment destinations. Transfers can *only* target statically pre-configured allowlist addresses. |
| **Runaway Spend** | Enforces per-transaction limits (e.g., max \$150 USD) and rolling 24-hour daily budget caps (e.g., max \$500 USD). |
| **Unilateral Agent Execution** | PayBox write tools enforce human-in-the-loop authorization via deep-link signing handoff (`signing_handoff.console_url`). |

---

## 🚀 Features & Capabilities

- 🔄 **Multi-Chain Support**: Native gas rebalancing for **Solana** (`SOL`), **Base** (`ETH`), and **Ethereum** (`ETH`).
- 🧠 **Dynamic Deficit Calculus**: Calculates the optimal top-up amount using safe operational buffer multipliers (`deficit = (targetBalance - currentBalance) * bufferMultiplier`).
- 💱 **Automated Liquidity Route Planning**: If native gas reserves are depleted, Sentinel automatically plans a `USDC -> Gas` token swap via `paybox_request_swap` before executing the top-up.
- 📜 **Verifiable Markdown Receipts**: Posts complete transaction audits (Tx Hash, Relayer ID, amount, block explorer URL) directly back to the original email thread and creates a treasury audit draft.
- 🔌 **Standard Mermail MCP Compatibility**: Interoperates with `Nudgen-Marketing/mermail-skills` tooling without requiring custom MCP server forks.

---

## 🏁 Quickstart & Demo

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Mermail Account**: Access to [Mermail Console](https://console.mermail.app) with MCP credentials.

### 2. Clone & Install
```bash
git clone https://github.com/[YOUR_GITHUB_HANDLE]/mermail-relayer-sentinel.git
cd mermail-relayer-sentinel
npm install
```

### 3. Run the Interactive Live Demo
Experience the full 6-phase autonomous workflow, including prompt injection interception and on-chain settlement:
```bash
# Run cinematic showcase
node demo/run-demo.mjs

# Fast mode (for quick CI runs)
node demo/run-demo.mjs --fast
```

---

## 💻 Command Line Interface (CLI)

Sentinel includes a full CLI runner for terminal and automated CI/cron operations:

```bash
# Check Sentinel connectivity, mailbox status, and allowlist
node src/cli.js status

# Scan for unread relayer deficit alerts
node src/cli.js scan

# Process alerts and display human approval previews
node src/cli.js process

# Process alerts with automated approval (staging / trusted devnet environments)
node src/cli.js process --auto-approve
```

---

## ⚙️ Configuration Schema

Relayers and treasury boundaries are defined in `config/relayers.json`:

```json
{
  "relayers": [
    {
      "id": "solana-mainnet-relayer-01",
      "name": "Jupiter DEX Execution Relayer",
      "chain": "solana",
      "asset": "SOL",
      "address": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
      "threshold": 0.100,
      "targetBalance": 0.500,
      "maxSingleTopUp": 1.000,
      "enabled": true
    }
  ],
  "policy": {
    "defaultGasBufferMultiplier": 1.25,
    "maxSingleTopUpUsd": 150.0,
    "dailyMaxUsdCap": 500.0,
    "requireHumanAuthorization": true
  }
}
```

---

## 🧪 Testing & Validation

### Standalone Test Suite (`d:\MERMAIL`)
Runs unit tests for address validation, allowlist enforcement, prompt injection sanitization, budget tracking, and end-to-end multi-chain rebalancing:
```bash
npm test
```
*Result: 14 passing suites across unit, security, and integration layers.*

### Skill Specification Validator
Verifies `SKILL.md`, `openai.yaml`, and reference documentation against the official Mermail repository standards:
```bash
node tests/validate-skill.mjs
```
*Result: 100% compliant with line limits, frontmatter schemas, and tool definitions.*

### Upstream Verification (`Nudgen-Marketing/mermail-skills`)
Tested directly inside the official cloned upstream repository:
```bash
node tests/validate.mjs
```
*Result: Validated 17 skills and 71 business tools with zero errors.*

---

## 📂 Directory Structure

```text
├── config/
│   └── relayers.json               # Relayer allowlist, thresholds & risk policy
├── demo/
│   ├── run-demo.mjs                # Interactive cinematic terminal showcase
│   └── DEMO_SCRIPT.md              # 3-minute video presentation script & tweet copy
├── docs/
│   ├── ARCHITECTURE.md             # In-depth technical architecture & data flow
│   └── SECURITY.md                 # Threat model & zero-trust invariant specifications
├── skills/
│   └── mermail-relayer-sentinel/
│       ├── SKILL.md                # Official Mermail skill definition (<500 lines)
│       ├── agents/
│       │   └── openai.yaml         # OpenClaw & ChatGPT interface metadata
│       └── references/
│           ├── allowlist.md        # Relayer registry configuration reference
│           ├── security.md         # Cryptographic invariants & prompt defenses
│           ├── templates.md        # Replenishment preview & receipt formats
│           ├── tools.md            # Mermail MCP tool mapping & schemas
│           └── workflows.md        # 6-phase autonomous state machine specification
├── src/
│   ├── cli.js                      # Command line interface runner
│   ├── config.js                   # Configuration loader
│   ├── mermail-client.js           # Multi-mode MCP client (Mock / Streamable HTTP)
│   ├── mock/
│   │   └── mermail-mcp-server.js   # Full in-memory mock MCP server for zero-cost demos
│   ├── security.js                 # Base58/EVM validators, prompt sanitizer, budget tracker
│   ├── sentinel-agent.js           # Core autonomous orchestrator
│   └── types.js                    # Status enums, chains, and token types
├── tests/
│   ├── fixtures/
│   │   └── alerts.json             # Test email vectors (valid alerts & attack payloads)
│   ├── integration/
│   │   └── workflow.test.mjs       # End-to-end integration test suite
│   ├── unit/
│   │   ├── security.test.mjs       # Address & injection tests
│   │   └── sentinel.test.mjs       # Alert parsing & triage tests
│   └── validate-skill.mjs          # Skill format validator
├── package.json
├── LICENSE
└── README.md
```

---

## 🏆 Superteam Bounty Deliverables

- **Target Bounty**: [Build and Demo a Mermail Agent Skill](https://superteam.fun/earn/listing/build-and-demo-a-mermail-agent-skill)
- **Target Repository**: [`Nudgen-Marketing/mermail-skills`](https://github.com/Nudgen-Marketing/mermail-skills)
- **Included Skill**: `mermail-relayer-sentinel`
- **Supported AI Clients**: Claude Code, Codex, Cursor, and OpenClaw via Hosted MCP (`https://console.mermail.app/mcp`).
- **Submission Pull Request**: Ready for submission (see [`PR_DESCRIPTION.md`](PR_DESCRIPTION.md)).
- **Submission Form Details**: See [`BOUNTY_SUBMISSION.md`](BOUNTY_SUBMISSION.md).

---

## 📜 License

MIT © 2026. Built with ❤️ for the Solana and Mermail ecosystems.
