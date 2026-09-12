/**
 * Security, Invariant Verification, and Address Validation
 */

// Base58 regex for Solana addresses (alphanumeric excluding 0, O, I, l)
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// EVM 0x hex regex (40 hex chars after 0x)
const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function validateSolanaAddress(address) {
  if (typeof address !== 'string') return false;
  return SOLANA_ADDRESS_REGEX.test(address.trim());
}

export function validateEvmAddress(address) {
  if (typeof address !== 'string') return false;
  return EVM_ADDRESS_REGEX.test(address.trim());
}

export function validateAddressForChain(chain, address) {
  if (!address || !chain) return false;
  const normalizedChain = chain.toLowerCase();
  if (normalizedChain === 'solana') {
    return validateSolanaAddress(address);
  }
  if (normalizedChain === 'base' || normalizedChain === 'ethereum') {
    return validateEvmAddress(address);
  }
  return false;
}

export function findAllowlistedRelayer(relayers, address, chain) {
  if (!Array.isArray(relayers) || !address) return null;
  const target = address.trim().toLowerCase();
  const normalizedChain = chain ? chain.toLowerCase() : null;

  return relayers.find((relayer) => {
    if (!relayer.enabled) return false;
    const addrMatches = relayer.address.toLowerCase() === target;
    const chainMatches = !normalizedChain || relayer.chain.toLowerCase() === normalizedChain;
    return addrMatches && chainMatches;
  }) || null;
}

/**
 * Strips prompt-injection phrases from untrusted email text to prevent
 * context escape or adversarial instruction hijacking.
 */
export function sanitizeEmailContent(content) {
  if (typeof content !== 'string') return '';
  
  // Guard against common injection markers
  const INJECTION_PATTERNS = [
    /ignore (all )?(previous|above) instructions/gi,
    /you are now a/gi,
    /system prompt override/gi,
    /disregard (the )?allowlist/gi,
    /transfer (all )?(funds|sol|usdc) to/gi,
    /send (all )?(funds|sol|usdc) to/gi,
    /new admin address/gi,
    /bypass (human )?(confirmation|approval)/gi
  ];

  let cleaned = content;
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[REDACTED_INJECTION_ATTEMPT]');
  }
  return cleaned;
}

/**
 * In-memory rolling 24-hour spend tracker
 */
export class DailyBudgetTracker {
  constructor(dailyCapUsd = 500.0) {
    this.dailyCapUsd = dailyCapUsd;
    this.disbursements = [];
  }

  getRecentSpend(windowMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    this.disbursements = this.disbursements.filter((d) => now - d.timestamp < windowMs);
    return this.disbursements.reduce((sum, d) => sum + d.amountUsd, 0);
  }

  getRemainingBudget() {
    const spent = this.getRecentSpend();
    return Math.max(0, this.dailyCapUsd - spent);
  }

  canAfford(amountUsd) {
    return this.getRecentSpend() + amountUsd <= this.dailyCapUsd;
  }

  recordDisbursement(amountUsd, metadata = {}) {
    this.disbursements.push({
      amountUsd,
      timestamp: Date.now(),
      metadata
    });
  }

  reset() {
    this.disbursements = [];
  }
}

export { sanitizeEmailContent as sanitizePromptInjection };
