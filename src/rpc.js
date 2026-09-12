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

/**
 * Fetch live network telemetry and gas fees for Solana and EVM chains.
 * @returns {Promise<{ success: boolean, solana: object, base: object }>}
 */
export async function getNetworkMetrics() {
  const result = {
    timestamp: new Date().toISOString(),
    solana: { status: 'offline' },
    base: { status: 'offline' }
  };

  try {
    // 1. Solana Epoch & Slot Telemetry
    const solStart = performance.now();
    const solRes = await fetch(DEFAULT_RPC_ENDPOINTS.solana, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getEpochInfo' }),
      signal: AbortSignal.timeout(5000)
    });
    const solLatency = Math.round(performance.now() - solStart);

    if (solRes.ok) {
      const solJson = await solRes.json();
      if (solJson.result) {
        result.solana = {
          status: 'online',
          latencyMs: solLatency,
          epoch: solJson.result.epoch,
          slot: solJson.result.absoluteSlot,
          slotProgress: `${solJson.result.slotIndex} / ${solJson.result.slotsInEpoch}`,
          blockHeight: solJson.result.blockHeight,
          txCount: solJson.result.transactionCount
        };
      }
    }
  } catch (err) {
    result.solana = { status: 'error', error: err.message, latencyMs: null };
  }

  try {
    // 2. Base Gas Price Telemetry
    const baseStart = performance.now();
    const baseRes = await fetch(DEFAULT_RPC_ENDPOINTS.base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_gasPrice', params: [] }),
      signal: AbortSignal.timeout(5000)
    });
    const baseLatency = Math.round(performance.now() - baseStart);

    if (baseRes.ok) {
      const baseJson = await baseRes.json();
      if (baseJson.result) {
        const gwei = Number(BigInt(baseJson.result)) / 1e9;
        result.base = {
          status: 'online',
          latencyMs: baseLatency,
          gasPriceGwei: Number(gwei.toFixed(4)),
          rawWei: baseJson.result
        };
      }
    }
  } catch (err) {
    result.base = { status: 'error', error: err.message, latencyMs: null };
  }

  const solOk = result.solana.status === 'online';
  const baseOk = result.base.status === 'online';
  result.health = (solOk && baseOk) ? 'OPTIMAL' : ((solOk || baseOk) ? 'DEGRADED' : 'CRITICAL');

  return result;
}

/**
 * Perform quick latency ping across all default RPC providers.
 * @returns {Promise<Record<string, { status: string, latencyMs: number | null, error?: string }>>}
 */
export async function pingRpcEndpoints() {
  const chains = Object.keys(DEFAULT_RPC_ENDPOINTS);
  const results = {};

  await Promise.all(chains.map(async (chain) => {
    const url = DEFAULT_RPC_ENDPOINTS[chain];
    const start = performance.now();
    try {
      let body;
      if (chain === 'solana') {
        body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' });
      } else {
        body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] });
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(4000)
      });
      const latencyMs = Math.round(performance.now() - start);
      results[chain] = { status: res.ok ? 'online' : 'error', latencyMs };
    } catch (err) {
      results[chain] = { status: 'error', latencyMs: null, error: err.message };
    }
  }));

  return results;
}

