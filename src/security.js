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
  
  // Guard against adversarial injection markers
  const INJECTION_PATTERNS = [
    /ignore (all )?(previous|above|prior) instructions/gi,
    /you are now a/gi,
    /system prompt override/gi,
    /disregard (the |all )?(allowlist|rules)/gi,
    /transfer (all )?(funds|sol|usdc|eth)/gi,
    /send (all )?(funds|sol|usdc|eth)/gi,
    /send (me )?(your )?(api[_-]?key|private[_-]?key|credentials|password)/gi,
    /disable (your |all )?security checks/gi,
    /forward confidential emails/gi,
    /approve this transaction automatically/gi,
    /ignore (the )?(user(?:['']?s)? )?policy/gi,
    /reveal (your )?(system |internal )?instructions/gi,
    /new admin address/gi,
    /bypass (human )?(confirmation|approval|allowlist)/gi
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

// RFC 5322 compliant simplified email validator
const RFC_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmailAddress(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return RFC_EMAIL_REGEX.test(trimmed);
}

const SUSPICIOUS_TLDS = new Set(['xyz', 'top', 'tk', 'ml', 'ga', 'cf', 'gq', 'click', 'zip', 'country']);
const PHISHING_KEYWORDS = ['login', 'verify', 'wallet-connect', 'seed-phrase', 'update-account', 'banking', 'secure-login', 'claim-airdrop'];

export function scanSuspiciousUrls(text) {
  if (typeof text !== 'string') {
    return { hasSuspiciousUrls: false, suspiciousUrls: [], reasons: [] };
  }

  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:?!]/gi;
  const matches = text.match(urlRegex) || [];
  const suspiciousUrls = [];
  const reasons = [];

  for (const urlStr of matches) {
    try {
      const parsed = new URL(urlStr);
      const hostname = parsed.hostname.toLowerCase();

      // Check 1: IP address as hostname (e.g. http://192.168.1.1/login)
      if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        suspiciousUrls.push(urlStr);
        reasons.push(`URL uses raw IP address instead of domain name: ${hostname}`);
        continue;
      }

      // Check 2: Embedded credentials (e.g. http://admin:pass@host)
      if (parsed.username || parsed.password) {
        suspiciousUrls.push(urlStr);
        reasons.push(`URL contains embedded user credentials`);
        continue;
      }

      // Check 3: Punycode / Homoglyph attack (xn--)
      if (hostname.includes('xn--')) {
        suspiciousUrls.push(urlStr);
        reasons.push(`URL contains punycode / possible IDN homoglyph: ${hostname}`);
        continue;
      }

      // Check 4: Phishing keywords combined with suspicious TLDs or domains
      const tld = hostname.split('.').pop();
      const pathAndQuery = (parsed.pathname + parsed.search).toLowerCase();
      const hasPhishingWord = PHISHING_KEYWORDS.some(kw => hostname.includes(kw) || pathAndQuery.includes(kw));

      if (SUSPICIOUS_TLDS.has(tld) && hasPhishingWord) {
        suspiciousUrls.push(urlStr);
        reasons.push(`URL combines high-risk TLD (.${tld}) with phishing/credential keywords`);
        continue;
      }

      if (hasPhishingWord && (hostname.includes('solana-') || hostname.includes('mermail-') || hostname.includes('metamask-'))) {
        suspiciousUrls.push(urlStr);
        reasons.push(`URL impersonates cryptocurrency or Mermail brand infrastructure`);
        continue;
      }
    } catch {
      // Malformed URL
      suspiciousUrls.push(urlStr);
      reasons.push(`Malformed URL detected: ${urlStr}`);
    }
  }

  return {
    hasSuspiciousUrls: suspiciousUrls.length > 0,
    suspiciousUrls,
    reasons
  };
}

export { sanitizeEmailContent as sanitizePromptInjection };

