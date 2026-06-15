// CoinGecko free API for live prices
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Map token symbols to CoinGecko IDs
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  NEAR: "near",
  // Stablecoins
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
  // DeFi
  WBTC: "wrapped-bitcoin",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  CRV: "curve-dao-token",
  LDO: "lido-dao",
  GMX: "gmx",
  DYDX: "dydx-chain",
  ARB: "arbitrum",
  GNO: "gnosis",
  EIGEN: "eigenlayer",
  STRK: "starknet",
  ZRO: "layerzero",
  // Meme
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
  PEPE: "pepe",
  FLOKI: "floki",
  BONK: "bonk",
  WIF: "dogwifcoin",
  // AI
  FET: "fetch-ai",
  RNDR: "render-token",
  TAO: "bittensor",
  OCEAN: "ocean-protocol",
  // Commodities
  PAXG: "pax-gold",
  XAUT: "tether-gold",
  // x404
  PANDORA: "pandora",
  DN404: "dn404",
  // Solana ecosystem
  JUP: "jupiter-exchange-solana",
  RAY: "raydium",
  PYTH: "pyth-network",
  ORCA: "orca",
};

export interface PriceData {
  usd: number;
  usd_24h_change: number;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

/**
 * Fetch current prices for multiple tokens from CoinGecko
 */
export const fetchPrices = async (symbols: string[]): Promise<Record<string, PriceData>> => {
  const ids = symbols
    .map((s) => SYMBOL_TO_ID[s.toUpperCase()])
    .filter(Boolean);

  if (ids.length === 0) return {};

  try {
    const res = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`
    );
    if (!res.ok) throw new Error("CoinGecko API error");
    const data = await res.json();

    const result: Record<string, PriceData> = {};
    for (const symbol of symbols) {
      const id = SYMBOL_TO_ID[symbol.toUpperCase()];
      if (id && data[id]) {
        result[symbol.toUpperCase()] = {
          usd: data[id].usd,
          usd_24h_change: data[id].usd_24h_change || 0,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
};

/**
 * Fetch price history for a token (7d, 30d, 365d)
 */
export const fetchPriceHistory = async (
  symbol: string,
  days: number
): Promise<PriceHistoryPoint[]> => {
  const id = SYMBOL_TO_ID[symbol.toUpperCase()];
  if (!id) return [];

  try {
    const res = await fetch(
      `${COINGECKO_API}/coins/${id}/market_chart?vs_currency=usd&days=${days}`
    );
    if (!res.ok) throw new Error("CoinGecko API error");
    const data = await res.json();

    if (!data.prices) return [];

    // Sample points to avoid too many data points
    const prices: [number, number][] = data.prices;
    const step = Math.max(1, Math.floor(prices.length / (days <= 7 ? 7 * 24 : days <= 30 ? 30 : 365)));

    return prices
      .filter((_, i) => i % step === 0 || i === prices.length - 1)
      .map(([timestamp, price]) => {
        const d = new Date(timestamp);
        return {
          date:
            days <= 7
              ? d.toLocaleDateString("en", { weekday: "short" })
              : days <= 30
              ? d.toLocaleDateString("en", { month: "short", day: "numeric" })
              : d.toLocaleDateString("en", { month: "short", year: "2-digit" }),
          price: parseFloat(price.toFixed(price < 1 ? 4 : 2)),
        };
      });
  } catch {
    return [];
  }
};

// ─── Market data (cap, volume, supply) ───

export interface MarketData {
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number | null;
  high24h: number;
  low24h: number;
}

export const fetchMarketData = async (symbol: string): Promise<MarketData | null> => {
  const id = SYMBOL_TO_ID[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const res = await fetch(`${COINGECKO_API}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`);
    if (!res.ok) return null;
    const data = await res.json();
    const md = data.market_data;
    if (!md) return null;
    return {
      marketCap: md.market_cap?.usd || 0,
      volume24h: md.total_volume?.usd || 0,
      circulatingSupply: md.circulating_supply || 0,
      totalSupply: md.total_supply,
      high24h: md.high_24h?.usd || 0,
      low24h: md.low_24h?.usd || 0,
    };
  } catch {
    return null;
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price: number): string => {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
};

export const formatLargeNumber = (n: number): string => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

/**
 * Format change percentage
 */
export const formatChange = (change: number): { text: string; up: boolean } => {
  const up = change >= 0;
  return {
    text: `${up ? "+" : ""}${change.toFixed(1)}%`,
    up,
  };
};

export const getCoinGeckoId = (symbol: string): string | undefined => {
  return SYMBOL_TO_ID[symbol.toUpperCase()];
};

/**
 * Register a CoinGecko ID for a symbol at runtime (used by custom alerts).
 */
export const registerSymbolId = (symbol: string, id: string) => {
  SYMBOL_TO_ID[symbol.toUpperCase()] = id;
};

/**
 * Validate a token symbol against CoinGecko search API.
 * Returns the coin id if found, otherwise null.
 */
export const validateSymbolWithCoinGecko = async (
  symbol: string
): Promise<{ id: string; symbol: string; name: string } | null> => {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  // Already known
  const known = SYMBOL_TO_ID[sym];
  if (known) return { id: known, symbol: sym, name: sym };
  try {
    const res = await fetch(`${COINGECKO_API}/search?query=${encodeURIComponent(sym)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const coins: Array<{ id: string; symbol: string; name: string; market_cap_rank: number | null }> =
      data?.coins || [];
    // Prefer exact symbol match with highest market cap rank
    const exact = coins
      .filter((c) => c.symbol?.toUpperCase() === sym)
      .sort((a, b) => (a.market_cap_rank ?? 9e9) - (b.market_cap_rank ?? 9e9));
    const pick = exact[0] || coins[0];
    if (!pick) return null;
    SYMBOL_TO_ID[sym] = pick.id;
    return { id: pick.id, symbol: sym, name: pick.name };
  } catch {
    return null;
  }
};
