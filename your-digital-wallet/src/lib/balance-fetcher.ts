import { getActiveRpc } from "@/lib/network-config";
import { logRpcCall } from "@/lib/rpc-debug-log";

// Public RPC fallbacks for cross-chain balance reads (imported wallets).
const PUBLIC_RPCS: Record<number, string[]> = {
  1: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth", "https://cloudflare-eth.com"],
  137: ["https://polygon-rpc.com", "https://rpc.ankr.com/polygon"],
};

const rpcCache = new Map<number, string>();

/** Exposed for tests: allow injecting a deterministic RPC per chain. */
export function __setRpcForChain(chainId: number, url: string) {
  rpcCache.set(chainId, url);
}
export function __clearRpcCache() {
  rpcCache.clear();
}

async function resolveRpcForChain(chainId?: number): Promise<string | null> {
  if (!chainId) return await getActiveRpc();
  if (rpcCache.has(chainId)) return rpcCache.get(chainId)!;
  const candidates = PUBLIC_RPCS[chainId];
  if (!candidates) return await getActiveRpc();
  for (const url of candidates) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        rpcCache.set(chainId, url);
        return url;
      }
    } catch {
      continue;
    }
  }
  return await getActiveRpc();
}

/**
 * Fetch native (GYDS) balance for an address
 */
export const fetchNativeBalance = async (address: string): Promise<string> => {
  const rpc = await getActiveRpc();
  if (!rpc) return "0";

  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });
    const data = await res.json();
    logRpcCall({ kind: "native", rpcUrl: rpc, ok: !!data?.result });
    if (data.result) {
      return formatBalance(data.result, 18);
    }
  } catch (e: any) {
    logRpcCall({ kind: "native", rpcUrl: rpc, ok: false, error: String(e?.message ?? e) });
  }
  return "0";
};

/**
 * Fetch ERC-20 token balance for an address
 * balanceOf(address) selector = 0x70a08231
 */
export const fetchTokenBalance = async (
  tokenAddress: string,
  walletAddress: string,
  decimals: number = 18,
  chainId?: number
): Promise<string> => {
  const rpc = await resolveRpcForChain(chainId);
  if (!rpc) {
    logRpcCall({ kind: "balance", chainId, rpcUrl: "(none)", contract: tokenAddress, ok: false, error: "no rpc" });
    return "0";
  }

  try {
    const paddedAddress = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const data = `0x70a08231${paddedAddress}`;

    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: tokenAddress, data }, "latest"],
        id: 1,
      }),
    });
    const result = await res.json();
    const ok = !!(result?.result && result.result !== "0x");
    logRpcCall({ kind: "balance", chainId, rpcUrl: rpc, contract: tokenAddress, ok });
    if (ok) {
      return formatBalance(result.result, decimals);
    }
  } catch (e: any) {
    logRpcCall({
      kind: "balance",
      chainId,
      rpcUrl: rpc,
      contract: tokenAddress,
      ok: false,
      error: String(e?.message ?? e),
    });
  }
  return "0";
};

/**
 * Fetch multiple token balances in parallel (per-token chainId aware).
 */
export const fetchAllTokenBalances = async (
  tokens: Array<{ contractAddress: string; decimals: number; symbol: string; chainId?: number }>,
  walletAddress: string
): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};

  const promises = tokens.map(async (token) => {
    const balance = await fetchTokenBalance(
      token.contractAddress,
      walletAddress,
      token.decimals,
      token.chainId
    );
    results[token.symbol] = balance;
  });

  await Promise.all(promises);
  return results;
};

/**
 * Format a hex balance with decimals to a human-readable string
 */
const formatBalance = (hexValue: string, decimals: number): string => {
  const raw = BigInt(hexValue);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;

  if (remainder === BigInt(0)) {
    return whole.toLocaleString();
  }

  const remainderStr = remainder.toString().padStart(decimals, "0");
  // Show up to 4 decimal places
  const trimmed = remainderStr.slice(0, 4).replace(/0+$/, "");
  if (!trimmed) return whole.toLocaleString();
  return `${whole.toLocaleString()}.${trimmed}`;
};

/**
 * Get connected wallet address from MetaMask/injected provider
 */
export const getConnectedWallet = async (): Promise<string | null> => {
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  try {
    const accounts = await ethereum.request({ method: "eth_accounts" });
    return accounts?.[0] || null;
  } catch {
    return null;
  }
};

/**
 * Request wallet connection
 */
export const connectWallet = async (): Promise<string | null> => {
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    return accounts?.[0] || null;
  } catch {
    return null;
  }
};
