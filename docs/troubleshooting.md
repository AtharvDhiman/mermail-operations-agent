# Mermail Autonomous Operations Agent: Troubleshooting Guide

## Quick Diagnostics

Run the built-in health check to identify common issues:

```bash
npm run doctor
# or
node bin/cli.js doctor
node bin/cli.js doctor --json   # Machine-readable output
```

The `doctor` command checks 8 critical subsystems and reports pass/fail for each.

---

## Common Issues & Resolutions

### 1. `npm test` Fails with Import Errors

**Symptom**: `ERR_MODULE_NOT_FOUND` or `SyntaxError: Cannot use import statement`

**Resolution**:
- Ensure Node.js ≥ 18.0.0 (ESM native support required).
- Verify `"type": "module"` exists in `package.json`.
- Run `npm install` to ensure all dependencies are present.

```bash
node --version    # Must be >= 18.0.0
npm install
npm test
```

### 2. Port 3333 Already in Use

**Symptom**: `EADDRINUSE: address already in use :::3333`

**Resolution**:
```bash
# Windows
netstat -ano | findstr :3333
taskkill /PID <PID> /F

# macOS / Linux
lsof -ti :3333 | xargs kill -9
```

Or set a custom port:
```bash
PORT=4444 node src/server.js
```

### 3. Demo Shows Empty Results

**Symptom**: `npm run demo` produces no output or truncated output.

**Resolution**:
1. Reset the demo environment first:
   ```bash
   npm run reset
   ```
2. Re-run the demo:
   ```bash
   npm run demo
   ```

### 4. Audit Log is Missing or Corrupted

**Symptom**: `node bin/cli.js audit` returns empty results or JSON parse errors.

**Resolution**:
```bash
# Clear and rebuild the audit log
npm run reset

# Verify the data directory exists
ls data/
```

The reset command clears `data/memory.json`, `data/approvals.json`, `data/followups.json`, `data/audit_log.jsonl`, and `data/idempotency.json`.

### 5. RPC Connectivity Failures

**Symptom**: `doctor` reports RPC endpoints as unreachable.

**Cause**: Public RPC endpoints (`api.mainnet-beta.solana.com`, `mainnet.base.org`) may be rate-limited or temporarily unavailable.

**Resolution**:
- These are used for live balance queries only; the core agent pipeline works without them.
- To use custom RPC endpoints, configure them in `config/sentinel.json`.
- The agent gracefully falls back to cached data when RPC is unavailable.

### 6. Mermail API Key Not Set

**Symptom**: `ENVIRONMENT=live` but MCP calls fail with authentication errors.

**Resolution**:
1. Obtain an API key from [console.mermail.app](https://console.mermail.app).
2. Set it in `.env`:
   ```
   MERMAIL_API_KEY=your_key_here
   ENVIRONMENT=live
   ```
3. The project runs in `mock` mode by default and does not require an API key for local development or demos.

### 7. Skill Validation Fails

**Symptom**: `npm run test:skill` reports validation errors.

**Resolution**:
- Ensure skill files are under 500 lines.
- Verify YAML frontmatter includes required fields (`name`, `description`, `tools`).
- Check that only official Mermail tools are referenced.

```bash
node tests/validate-skill.mjs
```

---

## Full Environment Reset

To completely reset the agent to a clean state:

```bash
npm run reset
```

This clears:
- `data/memory.json` — Task memory and contact profiles
- `data/approvals.json` — Pending dual-control approval tokens
- `data/followups.json` — Scheduled follow-up cadences
- `data/audit_log.jsonl` — Immutable audit trail
- `data/idempotency.json` — SHA-256 deduplication cache

After reset, you can run `npm run demo` for a fresh demonstration.
