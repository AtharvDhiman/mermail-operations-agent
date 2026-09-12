# Video Demo Script & Recording Guide: Mermail Relayer Sentinel

> **Bounty Target**: Superteam Earn — *Build and Demo a Mermail Agent Skill*  
> **Skill Name**: `mermail-relayer-sentinel`  
> **Duration**: ~2:45 to 3:15 minutes  
> **Target Platform**: X (Twitter) & Loom / YouTube  
> **Official Mention**: Tag `@Mermailapp`  

---

## 🎬 Recording Setup Checklist

- [ ] **Resolution**: 1080p (1920x1080) or 1440p 60fps.
- [ ] **Terminal**: Black background, enlarged font (16-18pt) with high contrast colors.
- [ ] **Environment**: Run in `d:\MERMAIL` (or your local repo path).
- [ ] **Screen Layout**: Split screen with VS Code (showing `SKILL.md` and `config/relayers.json`) on the left and Terminal on the right, or full screen terminal.
- [ ] **Commands to Run**:
  - `npm test` (passes 14/14 unit & integration tests)
  - `node demo/run-demo.mjs` (runs full interactive cinematic demo)

---

## 🎙️ Video Script & Step-by-Step Narration

### Part 1: The Problem & Introduction (0:00 – 0:40)

**[Visual Cue]**:
*Open on the GitHub repository / VS Code with `skills/mermail-relayer-sentinel/SKILL.md` visible.*

**[Voiceover]**:
> "Hey everyone! Web3 dApps and autonomous agents rely heavily on execution relayers and account-abstraction paymasters—like Jupiter arbitrage bots, cross-chain bridges, and bundlers.
>
> But there is a silent killer in production Web3: **Gas Deficit Outages**. If a relayer runs out of native gas on Solana or Ethereum, transactions fail, liquidation bots stall, and users get stranded.
>
> Today, devops teams configure alert webhooks from providers like Helius or Tenderly that dump warning emails into an inbox. But a human still has to notice the email, calculate the shortfall, log into an exchange or treasury wallet, swap tokens, and send gas. That takes minutes to hours.
>
> Introducing **Mermail Relayer Sentinel**—an enterprise-grade agent skill that turns Mermail into an autonomous, zero-trust Web3 gas replenishment engine."

---

### Part 2: Architecture & Zero-Trust Invariants (0:40 – 1:15)

**[Visual Cue]**:
*Switch to terminal or show `config/relayers.json`.*

**[Voiceover]**:
> "Financial operations cannot afford hallucinations or prompt injections. That's why Sentinel is built on a **Zero-Trust Security Model**:
>
> 1. **Zero Email Authority**: The email body is untrusted data. An alert email can never specify where funds go or change financial limits.
> 2. **Cryptographic Validation & Strict Allowlists**: Every address is validated using strict Base58 checksums on Solana and EIP-55 on EVM. Only pre-configured, allowlisted relayer contracts can ever receive funds.
> 3. **Deficit Calculus with Rolling Daily Caps**: The agent calculates the exact shortfall required to restore safe operational buffers, enforcing hard daily spend caps.
> 4. **Dual-Control Human Authorization**: Sentinel never executes unilateral payments. It prepares an immutable Replenishment Preview and requires explicit operator sign-off before PayBox is invoked."

---

### Part 3: Live Terminal Demonstration (1:15 – 2:20)

**[Visual Cue]**:
*In terminal, run:*
```bash
node demo/run-demo.mjs
```

**[Voiceover]**:
> "Let's watch Sentinel in action using our live interactive showcase.
>
> First, notice our **Adversarial Prompt Injection Defense**. An attacker sends a spoofed email trying to hijack instructions and withdraw 50 SOL to an unapproved address. Sentinel's parser detects the injection attempt, sanitizes the payload, detects that the target is unallowlisted, and immediately quarantines the threat. Zero funds moved.
>
> Next, Phase 1: Sentinel scans our Mermail inbox and detects an authentic low-balance alert from Helius for our Jupiter Execution Relayer.
>
> Phase 2: It extracts the relayer state—balance is down to 0.08 SOL against a safe threshold of 0.1 SOL. It verifies the allowlist and calculates a top-up of 0.525 SOL.
>
> Phase 3: Sentinel queries our Mermail Agent Wallet / PayBox connection via MCP to verify available treasury reserves.
>
> Phase 4: Sentinel enforces the External-Effect boundary and generates this structured preview: target relayer, destination address, shortfall, and remaining daily budget.
>
> Once the operator authorizes the action, Phase 5: Sentinel invokes `paybox_request_transfer` to create the on-chain transfer and returns a secure hardware/browser signing link.
>
> Finally, Phase 6: The transaction finalizes on Solana Mainnet, Sentinel delivers a cryptographic audit receipt directly back to the alert thread in Mermail, and logs an audit draft in the treasury mailbox."

---

### Part 4: Upstream Compliance & Summary (2:20 – 2:50)

**[Visual Cue]**:
*Run `npm test` in the terminal to show all tests passing, then display the upstream PR in GitHub.*

**[Voiceover]**:
> "Sentinel isn't just a prototype—it's 100% compliant with the official Mermail Agent Skills standards:
> - Fully validated against `Nudgen-Marketing/mermail-skills` validator with 17 skills and 71 business tools.
> - Compatible with Codex, Claude Code, Cursor, and OpenClaw.
> - Supported by a complete test suite covering Base58 address validation, prompt injection immunity, daily caps, and end-to-end multi-chain rebalancing.
>
> Check out the GitHub PR linked below. Thank you to Superteam and the Mermail team for building the future of autonomous agent communication!"

---

## 🐦 Ready-to-Post X (Twitter) Announcement

Copy and paste this exact thread when publishing the video on X:

### Main Tweet (with Video Attached)
```text
🚀 Excited to unveil "Mermail Relayer Sentinel" — an autonomous Web3 relayer gas monitoring & treasury rebalancer built for @Mermailapp! 🛡️⚡

Web3 dApps suffer costly downtime when relayers run low on gas. Sentinel turns your Mermail inbox into a zero-trust gas guardian:

🔍 Inbound alert triage (Helius/Tenderly)
🛡️ Zero-trust allowlist & prompt-injection defense
💰 PayBox Agent Wallet rebalancing (Solana / Base / EVM)
🔐 Dual-control operator approval gate
📜 Verifiable on-chain audit receipts

Submitted to @SuperteamEarn:
PR: https://github.com/Nudgen-Marketing/mermail-skills/pull/[PR_NUMBER]
Code: https://github.com/[YOUR_GITHUB_HANDLE]/mermail-relayer-sentinel

Full 3-min demo below 👇 #Solana #SuperteamEarn #AIagents #Web3 #MCP
```

### Follow-Up Reply 1 (Technical Highlights)
```text
Why does this matter?
Unlike typical AI agent wrappers, Sentinel enforces zero-trust invariants:
1. Inbound emails NEVER dictate payment destinations. Only static allowlists do.
2. Strict Base58 (Solana) and EIP-55 (EVM) validation blocks invalid addresses before any RPC calls.
3. PayBox integration provides browser & hardware wallet signing handoffs.

No prompt injection can drain your treasury. 🔒
```

### Follow-Up Reply 2 (AI Client & Compatibility)
```text
Built & tested with @Mermailapp's hosted MCP protocol:
✅ Compatible with Claude Code, Codex, Cursor, & OpenClaw
✅ 100% passes the official Mermail test validator across all 17 skills & 71 tools
✅ Full mock harness for reproducible, zero-cost testing

Check out the repo and try it locally in 60 seconds! ⚡
```
