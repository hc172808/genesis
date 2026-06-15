import { getActiveRpc } from "./network-config";
import { getCustomTokens, saveCustomToken, type CustomToken } from "./custom-tokens";

// Public RPCs keyed by chainId — used for cross-chain token discovery so
// imported wallets reveal balances on Ethereum / Polygon / etc., not just GYDS.
const PUBLIC_RPCS: Record<number, string[]> = {
  1: [
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://cloudflare-eth.com",
  ],
  137: [
    "https://polygon-rpc.com",
    "https://rpc.ankr.com/polygon",
  ],
};

// Well-known ERC-20 tokens to scan for balances
const DISCOVERY_TOKENS: Array<{
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  color: string;
  chainIds: number[];
}> = [
  { symbol: "USDT", name: "Tether", contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, color: "from-emerald-400 to-green-500", chainIds: [1] },
  { symbol: "USDC", name: "USD Coin", contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, color: "from-blue-500 to-cyan-400", chainIds: [1] },
  { symbol: "DAI", name: "Dai Stablecoin", contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, color: "from-amber-400 to-yellow-500", chainIds: [1] },
  { symbol: "WBTC", name: "Wrapped Bitcoin", contractAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8, color: "from-orange-400 to-amber-600", chainIds: [1] },
  { symbol: "LINK", name: "Chainlink", contractAddress: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18, color: "from-blue-600 to-indigo-400", chainIds: [1] },
  { symbol: "UNI", name: "Uniswap", contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18, color: "from-pink-500 to-rose-400", chainIds: [1] },
  { symbol: "AAVE", name: "Aave", contractAddress: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", decimals: 18, color: "from-purple-400 to-indigo-500", chainIds: [1] },
  { symbol: "CRV", name: "Curve DAO", contractAddress: "0xD533a949740bb3306d119CC777fa900bA034cd52", decimals: 18, color: "from-yellow-500 to-red-500", chainIds: [1] },
  { symbol: "SHIB", name: "Shiba Inu", contractAddress: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", decimals: 18, color: "from-orange-500 to-red-400", chainIds: [1] },
  { symbol: "PEPE", name: "Pepe", contractAddress: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", decimals: 18, color: "from-green-500 to-lime-400", chainIds: [1] },
  { symbol: "ARB", name: "Arbitrum", contractAddress: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1", decimals: 18, color: "from-blue-400 to-sky-500", chainIds: [1] },
  { symbol: "LDO", name: "Lido DAO", contractAddress: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32", decimals: 18, color: "from-sky-400 to-blue-500", chainIds: [1] },
  // Polygon tokens
  { symbol: "USDC.e", name: "Bridged USDC (Polygon)", contractAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6, color: "from-blue-500 to-cyan-400", chainIds: [137] },
  { symbol: "WMATIC", name: "Wrapped MATIC", contractAddress: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18, color: "from-violet-500 to-purple-500", chainIds: [137] },
];

const BALANCE_OF_SELECTOR = "0x70a08231";

async function getTokenBalance(
  rpcUrl: string,
  tokenAddress: string,
  walletAddress: string,
  decimals: number
): Promise<string> {
  const paddedAddress = walletAddress.replace("0x", "").padStart(64, "0");
  const data = `${BALANCE_OF_SELECTOR}000000000000000000000000${paddedAddress}`;

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: tokenAddress, data }, "latest"],
        id: 1,
      }),
    });
    const json = await response.json();
    if (!json.result || json.result === "0x" || json.result === "0x0") return "0";

    const raw = BigInt(json.result);
    if (raw === 0n) return "0";

    const divisor = BigInt(10 ** decimals);
    const whole = raw / divisor;
    const frac = raw % divisor;
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6).replace(/0+$/, "");
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return "0";
  }
}

export interface DiscoveredToken {
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  color: string;
  balance: string;
  chainId: number;
}

async function pickRpcForChain(chainId: number, fallback: string | null): Promise<string | null> {
  const candidates = PUBLIC_RPCS[chainId] || [];
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
      if (res.ok) return url;
    } catch {
      continue;
    }
  }
  return fallback;
}

export async function discoverTokens(walletAddress: string): Promise<DiscoveredToken[]> {
  if (!walletAddress) return [];
  const activeRpc = await getActiveRpc();

  const existing = new Set(getCustomTokens().map((t) => t.contractAddress.toLowerCase()));
  const candidates = DISCOVERY_TOKENS.filter(
    (t) => !existing.has(t.contractAddress.toLowerCase())
  );

  // Resolve a working RPC per chain once, in parallel
  const chainIds = Array.from(new Set(candidates.flatMap((c) => c.chainIds)));
  const rpcByChain: Record<number, string | null> = {};
  await Promise.all(
    chainIds.map(async (id) => {
      rpcByChain[id] = await pickRpcForChain(id, activeRpc);
    })
  );

  const results = await Promise.allSettled(
    candidates.map(async (token) => {
      const chainId = token.chainIds[0];
      const rpc = rpcByChain[chainId] || activeRpc;
      if (!rpc) return null;
      const balance = await getTokenBalance(rpc, token.contractAddress, walletAddress, token.decimals);
      if (balance !== "0") {
        const { chainIds: _omit, ...rest } = token;
        return { ...rest, balance, chainId } as DiscoveredToken;
      }
      return null;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<DiscoveredToken | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is DiscoveredToken => v !== null);
}

export function importDiscoveredToken(token: DiscoveredToken, chainId?: number): void {
  const custom: CustomToken = {
    symbol: token.symbol,
    name: token.name,
    contractAddress: token.contractAddress,
    decimals: token.decimals,
    color: token.color,
    chainId,
  };
  saveCustomToken(custom);
}

// Get last discovery timestamp
export function getLastDiscoveryTime(): number {
  return parseInt(localStorage.getItem("gyds_last_token_discovery") || "0", 10);
}

export function setLastDiscoveryTime(): void {
  localStorage.setItem("gyds_last_token_discovery", Date.now().toString());
}
