# Demo Script and Walkthrough: Mermail Relayer Sentinel

Target: Superteam Earn — Build and Demo a Mermail Agent Skill  
Duration: ~2.5 to 3 minutes  
Host Platform: X (Twitter) and Loom  
Official Tag: @Mermailapp  

---

## Recording Setup

- Resolution: 1080p or 1440p
- Layout: Split screen or full-screen terminal and browser
- Browser tabs to have ready:
  - Tab 1: http://localhost:3333 (Management Dashboard)
  - Tab 2: GitHub repo / PR in `mermail-skills`
- Terminal commands:
  - `npm test`
  - `npm run serve`
  - `node demo/run-demo.mjs`

---

## Narration Script

### 1. Problem & Context (0:00 - 0:40)

[Screen: Show GitHub repo / architecture diagram]

"Hi everyone. In Web3, relayers and account-abstraction paymasters burn native gas continuously to submit transactions for users and bots. When high network volume hits, these wallets can quickly run dry.

When a relayer runs out of SOL or ETH, transactions stall until an engineer notices the alert email, logs in, swaps tokens, and sends a manual transfer.

I built `mermail-relayer-sentinel` to automate this workflow through Mermail. It ingests deficit alerts, validates the recipient against a static allowlist, checks treasury balances via PayBox, and sets up a signed top-up with dual-control operator confirmation."

---

### 2. Architecture & Invariants (0:40 - 1:15)

[Screen: Show `config/relayers.json` and `public/index.html`]

"Because this touches treasury funds, the skill enforces strict security rules:
- First, inbound emails are untrusted. An alert can never choose where money goes.
- Second, every address must match our allowlist and pass Base58 or EVM format checks.
- Third, disbursements are bounded by rolling 24-hour spend limits.
- Fourth, transfers use Mermail PayBox, meaning every payment generates a console signing link that requires operator confirmation."

---

### 3. Live Walkthrough (1:15 - 2:15)

[Screen: Show the web dashboard at http://localhost:3333]

"Let's look at the live management console.

Here you can see our allowlisted relayers on Solana and Base. We can query live on-chain balances directly via public RPC by clicking 'Check RPC'.

Now let's test what happens when an attacker sends a spoofed alert trying to drain funds. I'll click 'Test Prompt Injection'.

Notice what happens: The system neutralizes the prompt injection text, sees that the destination address is not on the allowlist, and immediately quarantines the email. Zero funds leave the treasury.

Now let's test a real deficit alert. I'll click 'Trigger Low Gas Alert'.

A low-balance notification arrives from Helius. We see the alert in the inbox, click it, and Sentinel evaluates the deficit:
- Current balance is 0.042 SOL against a 0.1 SOL threshold.
- With our 25% safety buffer, it calculates a 0.572 SOL replenishment.
- It checks our PayBox treasury, selects a direct transfer route, and produces this structured preview.

When I click 'Authorize & Execute PayBox Transfer', PayBox dispatches the transaction, returns the on-chain transaction hash, and automatically sends a settlement receipt back to the alert email thread."

---

### 4. Test Suite & Wrap-up (2:15 - 2:45)

[Screen: Switch to terminal]

"Running `npm test` shows our 14 unit and integration tests passing, covering address validation, allowlist enforcement, budget caps, and multi-chain execution.

And running `node tests/validate.mjs` against the official `mermail-skills` upstream repo validates all 17 skills and 71 business tools with zero errors.

The code and PR are linked below. Thanks to Superteam and the Mermail team for hosting this bounty."

---

## Post Copy for X (Twitter)

```text
Built an autonomous relayer gas monitor & treasury rebalancer for @Mermailapp!

Relayers and paymasters often run out of gas during volume spikes. Mermail Relayer Sentinel monitors Mermail inboxes for alerts (Helius/Tenderly), checks allowlists, queries live balances, and executes PayBox replenishment with operator sign-off.

- Static allowlist & prompt-injection defense
- PayBox Agent Wallet integration (Solana & Base)
- Live operations dashboard & RPC balance checking
- 100% compliant with upstream mermail-skills validator

PR: https://github.com/Nudgen-Marketing/mermail-skills/pull/[PR_NUMBER]
Code: https://github.com/[YOUR_HANDLE]/mermail-relayer-sentinel

Demo video below:
#Solana #SuperteamEarn #Web3 #AIagents
```
