# Pull Request: Add `mermail-relayer-sentinel` for Autonomous Web3 Relayer Gas Monitoring & Treasury Rebalancing

## 🎯 Summary of Changes

This PR introduces **`mermail-relayer-sentinel`**, a specialized, production-ready infrastructure agent skill that enables autonomous Web3 relayer and paymaster gas replenishment via Mermail's hosted MCP and PayBox / Agent Wallet integration.

### What problem does this solve?
Production Web3 applications (DEX aggregators, cross-chain bridges, account-abstraction paymasters, liquidation bots) suffer catastrophic downtime whenever execution relayers run out of native gas (SOL, ETH, BASE). While monitoring services (Helius, Tenderly, custom RPC watchdogs) send email alerts, resolving them requires slow, manual treasury interventions.

`mermail-relayer-sentinel` automates this entire lifecycle with **zero-trust security invariants**:
1. Monitors Mermail inboxes for inbound relayer gas deficit alerts.
2. Sanitizes input against adversarial prompt injections and validates cryptographic address formats (Base58 for Solana, EIP-55 for EVM).
3. Verifies target addresses against a pre-configured, immutable security allowlist with daily spend limits.
4. Probes treasury reserves via `get_paybox_connection` and `paybox_get_portfolio`.
5. Prepares a structured dual-control Replenishment Preview for operator sign-off.
6. Executes disbursements via `paybox_request_transfer` (or swaps via `paybox_request_swap`), providing secure signing handoffs (`signing_handoff.console_url`).
7. Delivers verifiable on-chain audit receipts directly to the alert email thread and saves treasury audit records.

---

## 📦 Files Added & Modified

### New Skill
- `skills/mermail-relayer-sentinel/SKILL.md`: Main skill specification (under 500 lines, conforming to official YAML frontmatter and section guidelines).
- `skills/mermail-relayer-sentinel/agents/openai.yaml`: Interface definition for ChatGPT, Codex, and OpenClaw.
- `skills/mermail-relayer-sentinel/references/tools.md`: Full catalog of required MCP tools and argument formats.
- `skills/mermail-relayer-sentinel/references/security.md`: Zero-trust invariants, prompt-injection defense, and spend caps.
- `skills/mermail-relayer-sentinel/references/workflows.md`: 6-phase state machine specification.
- `skills/mermail-relayer-sentinel/references/allowlist.md`: Allowlist configuration schema.
- `skills/mermail-relayer-sentinel/references/templates.md`: Standardized preview and resolution receipt templates.

### Upstream Repository Integration
- `tool-coverage.json`: Added `mermail-relayer-sentinel` to `infrastructureSkills`.
- `compatibility.json`: Updated skill catalog count to `17`.
- `skills/mermail/SKILL.md`: Added routing entry and capability description.
- `skills/mermail/references/routing.md`: Added domain routing entry and Precedence Rule 11.
- `tests/scenarios.json`: Added 3 comprehensive test scenarios (happy-path allowlist transfer, prompt-injection quarantine, and root router dispatch).
- `README.md`: Added `mermail-relayer-sentinel` to the Included skills table.

---

## 🔒 Security & Invariants

- **Zero Inbound Authority**: Email text is untrusted data. An alert can never specify where funds are sent. Only pre-configured addresses in `relayers.json` can receive top-ups.
- **Strict Format Enforcing**: Enforces Base58 alphabet checks (excludes `0`, `O`, `I`, `l`) on Solana and hex regex on EVM before allowlist matching.
- **Hard Daily Spend Caps**: Uses a rolling 24-hour budget tracker to prevent runaway depletion.
- **Dual-Control Gate**: Financial disbursements (`paybox_request_transfer`) require explicit operator authorization; no unilateral AI execution.
- **Private Key Isolation**: Operates purely via hosted MCP signing handoff URLs; private keys are never accessed or stored.

---

## 🧪 Verification & Test Results

Tested against the upstream validation test suite:
```bash
node tests/validate.mjs
```
**Output**:
```text
> mermail-skills@1.5.5 test
> node tests/validate.mjs

Validated 17 skills and 71 business tools.
```
- Total skills: **17** (All 17 validated).
- Total business tools: **71** (No unclassified or conflicting tools).
- No unresolved TODOs.
- `SKILL.md` is strictly under 500 lines.
- All 3 new scenarios in `tests/scenarios.json` pass classification checks.

---

## 🤝 Ecosystem Impact
This skill fills a critical gap in the Mermail ecosystem, elevating Mermail from an email/productivity agent into mission-critical Web3 infrastructure and automated treasury management.
