# Pull Request: Add mermail-relayer-sentinel for Web3 relayer gas monitoring and PayBox replenishment

## Summary

This PR adds `mermail-relayer-sentinel`, an infrastructure agent skill that monitors Mermail inboxes for relayer gas deficit alerts and prepares replenishment transfers via PayBox.

### Problem
Protocols operating backend relayers and paymasters on Solana, Base, and Ethereum risk transaction halts when gas balances deplete during periods of heavy on-chain volume. While services like Helius and Tenderly dispatch email notifications, resolving them currently requires manual treasury intervention.

### Solution
`mermail-relayer-sentinel` automates alert ingestion and deficit calculation within strict security bounds:
1. Ingests low-balance alerts from designated monitoring senders.
2. Neutralizes potential prompt injection vectors in email bodies.
3. Enforces address format rules (Base58 for Solana, EIP-55 for EVM) and verifies against a static allowlist.
4. Checks treasury reserves via `paybox_get_portfolio`.
5. Prepares a structured replenishment preview for human authorization.
6. Executes transfers through `paybox_request_transfer` with console signing handoffs.
7. Posts completion receipts back to the original email thread.

---

## Changes

### New Skill
- `skills/mermail-relayer-sentinel/SKILL.md`: Skill definition and workflow guidelines (under 500 lines).
- `skills/mermail-relayer-sentinel/agents/openai.yaml`: Interface manifest for ChatGPT, Codex, and OpenClaw.
- `skills/mermail-relayer-sentinel/references/tools.md`: Tool mapping and JSON query conventions.
- `skills/mermail-relayer-sentinel/references/security.md`: Invariant rules and prompt injection defense.
- `skills/mermail-relayer-sentinel/references/workflows.md`: Execution state machine.
- `skills/mermail-relayer-sentinel/references/allowlist.md`: Configuration schema.
- `skills/mermail-relayer-sentinel/references/templates.md`: Canonical receipt and preview formats.

### Repository Integration
- `tool-coverage.json`: Added `mermail-relayer-sentinel` to `infrastructureSkills`.
- `compatibility.json`: Updated skill catalog count to `17`.
- `skills/mermail/SKILL.md`: Added routing description.
- `skills/mermail/references/routing.md`: Added domain routing entry and Precedence Rule 11.
- `tests/scenarios.json`: Added 3 test scenarios (happy-path replenishment preview, injection rejection, router dispatch).
- `README.md`: Added entry to Included Skills table.

---

## Verification

Validated using the upstream test suite:
```bash
node tests/validate.mjs
```
Output:
```text
> mermail-skills@1.5.5 test
> node tests/validate.mjs

Validated 17 skills and 71 business tools.
```
- All 17 skills validated with zero errors.
- All 71 business tools validated.
- Zero unresolved TODOs.
- `SKILL.md` is strictly under 500 lines.
