/**
 * On-chain RPC balance checker for Solana and EVM networks.
 * Uses native fetch without external dependencies.
 */

const DEFAULT_RPC_ENDPOINTS = {
  solana: 'https://api.mainnet-beta.solana.com',
  base: 'https://mainnet.base.org',
  ethereum: 'https://cloudflare-eth.com'
};

/**
 * Fetch native token balance for an address directly from on-chain RPC.
 * @param {string} chain - 'solana' | 'base' | 'ethereum'
 * @param {string} address - Base58 Solana address or 0x EVM address
 * @param {string} [customRpcUrl] - Optional custom RPC URL
 * @returns {Promise<{ success: boolean, balance: number, unit: string, raw?: any, error?: string }>}
 */
export async function getOnChainBalance(chain, address, customRpcUrl = null) {
  const normalizedChain = (chain || '').toLowerCase();
  const endpoint = customRpcUrl || DEFAULT_RPC_ENDPOINTS[normalizedChain];

  if (!endpoint) {
    return { success: false, balance: 0, unit: '', error: `Unsupported chain: ${chain}` };
  }

  try {
    if (normalizedChain === 'solana') {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'getBalance',
          params: [address]
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (!res.ok) {
        return { success: false, balance: 0, unit: 'SOL', error: `HTTP ${res.status}: ${res.statusText}` };
      }

      const json = await res.json();
      if (json.error) {
        return { success: false, balance: 0, unit: 'SOL', error: json.error.message || 'RPC Error' };
      }

      const lamports = json.result?.value ?? 0;
      const sol = lamports / 1e9;
      return { success: true, balance: Number(sol.toFixed(6)), unit: 'SOL', slot: json.result?.context?.slot };
    }

    if (normalizedChain === 'base' || normalizedChain === 'ethereum') {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_getBalance',
          params: [address, 'latest']
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (!res.ok) {
        return { success: false, balance: 0, unit: 'ETH', error: `HTTP ${res.status}: ${res.statusText}` };
      }

      const json = await res.json();
      if (json.error) {
        return { success: false, balance: 0, unit: 'ETH', error: json.error.message || 'RPC Error' };
      }

      const hexWei = json.result || '0x0';
      const wei = BigInt(hexWei);
      // Convert wei to ETH
      const eth = Number(wei) / 1e18;
      return { success: true, balance: Number(eth.toFixed(6)), unit: 'ETH' };
    }

    return { success: false, balance: 0, unit: '', error: `Unhandled chain type: ${chain}` };
  } catch (err) {
    return {
      success: false,
      balance: 0,
      unit: normalizedChain === 'solana' ? 'SOL' : 'ETH',
      error: err.name === 'TimeoutError' ? 'RPC query timed out' : err.message
    };
  }
}
