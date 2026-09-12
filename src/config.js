import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function loadConfig(options = {}) {
  const allowlistPath = options.allowlistPath || process.env.SENTINEL_ALLOWLIST_PATH || path.join(rootDir, 'config', 'relayers.json');
  
  let allowlist = {
    version: '1.0.0',
    policy: {
      maxDailyTopUpUsd: 500.0,
      maxSingleTopUpUsd: 150.0,
      requireHumanConfirmation: true,
      defaultGasBufferMultiplier: 1.25,
      allowlistedChains: ['solana', 'base', 'ethereum']
    },
    relayers: []
  };

  if (existsSync(allowlistPath)) {
    try {
      const raw = readFileSync(allowlistPath, 'utf8');
      allowlist = JSON.parse(raw);
    } catch (err) {
      console.error(`[Config] Failed to parse allowlist at ${allowlistPath}:`, err.message);
    }
  }

  return {
    apiKey: process.env.MERMAIL_API_KEY || 'sk-proj-simulation-key',
    mcpUrl: process.env.MERMAIL_MCP_URL || 'https://console.mermail.app/mcp',
    mailboxId: process.env.MERMAIL_MAILBOX_ID || 'mbx_ops_sentinel_01',
    environment: process.env.SENTINEL_ENV || 'simulation',
    dailyMaxUsdCap: Number(process.env.SENTINEL_DAILY_MAX_USD_CAP) || allowlist.policy?.maxDailyTopUpUsd || 500.0,
    maxSingleTopUpUsd: Number(process.env.SENTINEL_MAX_SINGLE_TOPUP_USD) || allowlist.policy?.maxSingleTopUpUsd || 150.0,
    policy: allowlist.policy,
    relayers: allowlist.relayers || []
  };
}
