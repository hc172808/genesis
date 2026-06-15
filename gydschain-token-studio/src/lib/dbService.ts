/**
 * Database service layer for GydsChain / Netlify Coin Tools.
 * 
 * This module provides a clean API to interact with your database.
 * Replace the `DB_API_URL` and auth headers with your actual database
 * REST API endpoint (e.g., Supabase, PostgREST, custom API).
 * 
 * All functions are async and return typed data.
 */

import type { DeployedToken, Transaction } from "./blockchain/types";

// ─── Configuration ───────────────────────────────────────────
// Set this to your database REST API base URL
const DB_API_URL = import.meta.env.VITE_DB_API_URL || "";
const DB_API_KEY = import.meta.env.VITE_DB_API_KEY || "";

const headers = () => ({
  "Content-Type": "application/json",
  "apikey": DB_API_KEY,
  "Authorization": `Bearer ${DB_API_KEY}`,
});

/** Check if database is configured */
export const isDbConfigured = (): boolean => {
  return DB_API_URL.length > 0 && DB_API_KEY.length > 0;
};

// ─── Generic fetch helper ────────────────────────────────────
const dbFetch = async <T>(path: string, options?: RequestInit): Promise<T | null> => {
  if (!isDbConfigured()) return null;
  try {
    const res = await fetch(`${DB_API_URL}${path}`, {
      ...options,
      headers: { ...headers(), ...options?.headers },
    });
    if (!res.ok) throw new Error(`DB Error: ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn("[DB]", err);
    return null;
  }
};

// ─── Users ───────────────────────────────────────────────────
export interface DbUser {
  id: string;
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export const getOrCreateUser = async (walletAddress: string): Promise<DbUser | null> => {
  // First try to find existing
  const existing = await dbFetch<DbUser[]>(`/rest/v1/users?wallet_address=eq.${walletAddress}&select=*`);
  if (existing && existing.length > 0) {
    return existing[0];
  }

  // Create new
  const created = await dbFetch<DbUser[]>(`/rest/v1/users`, {
    method: "POST",
    body: JSON.stringify({ wallet_address: walletAddress }),
    headers: { Prefer: "return=representation" },
  });
  return created?.[0] ?? null;
};

// ─── Tokens ──────────────────────────────────────────────────
export interface DbToken {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
  current_supply: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  contract_address: string | null;
  transaction_hash: string | null;
  creator_address: string;
  network: string;
  is_paused: boolean;
  freeze_revoked: boolean;
  mint_revoked: boolean;
  created_at: string;
}

export const fetchTokens = async (network = "devnet"): Promise<DbToken[]> => {
  const data = await dbFetch<DbToken[]>(
    `/rest/v1/tokens?network=eq.${network}&order=created_at.desc&select=*`
  );
  return data ?? [];
};

export const fetchTokenByAddress = async (address: string): Promise<DbToken | null> => {
  const data = await dbFetch<DbToken[]>(
    `/rest/v1/tokens?contract_address=eq.${address}&select=*`
  );
  return data?.[0] ?? null;
};

export const createToken = async (token: Partial<DbToken>): Promise<DbToken | null> => {
  const data = await dbFetch<DbToken[]>(`/rest/v1/tokens`, {
    method: "POST",
    body: JSON.stringify(token),
    headers: { Prefer: "return=representation" },
  });
  return data?.[0] ?? null;
};

// ─── Transactions ────────────────────────────────────────────
export interface DbTransaction {
  id: string;
  hash: string;
  type: string;
  token_symbol: string;
  amount: string | null;
  from_address: string | null;
  to_address: string | null;
  status: string;
  network: string;
  created_at: string;
}

export const fetchTransactions = async (network = "devnet", limit = 50): Promise<DbTransaction[]> => {
  const data = await dbFetch<DbTransaction[]>(
    `/rest/v1/transactions?network=eq.${network}&order=created_at.desc&limit=${limit}&select=*`
  );
  return data ?? [];
};

export const createTransaction = async (tx: Partial<DbTransaction>): Promise<DbTransaction | null> => {
  const data = await dbFetch<DbTransaction[]>(`/rest/v1/transactions`, {
    method: "POST",
    body: JSON.stringify(tx),
    headers: { Prefer: "return=representation" },
  });
  return data?.[0] ?? null;
};

// ─── Liquidity Pools ─────────────────────────────────────────
export interface DbPool {
  id: string;
  pair_address: string | null;
  token0_symbol: string;
  token1_symbol: string;
  reserve0: string;
  reserve1: string;
  total_lp_supply: string;
  fee_tier: number;
  pool_type: string;
  creator_address: string;
  is_active: boolean;
  created_at: string;
}

export const fetchPools = async (network = "devnet"): Promise<DbPool[]> => {
  const data = await dbFetch<DbPool[]>(
    `/rest/v1/liquidity_pools?network=eq.${network}&is_active=eq.true&order=created_at.desc&select=*`
  );
  return data ?? [];
};

export const createPool = async (pool: Partial<DbPool>): Promise<DbPool | null> => {
  const data = await dbFetch<DbPool[]>(`/rest/v1/liquidity_pools`, {
    method: "POST",
    body: JSON.stringify(pool),
    headers: { Prefer: "return=representation" },
  });
  return data?.[0] ?? null;
};

// ─── Burns ───────────────────────────────────────────────────
export interface DbBurn {
  id: string;
  token_symbol: string;
  amount: string;
  burner_address: string;
  reward_amount: string;
  transaction_hash: string | null;
  created_at: string;
}

export const fetchBurns = async (network = "devnet"): Promise<DbBurn[]> => {
  const data = await dbFetch<DbBurn[]>(
    `/rest/v1/burns?network=eq.${network}&order=created_at.desc&select=*`
  );
  return data ?? [];
};

export const createBurn = async (burn: Partial<DbBurn>): Promise<DbBurn | null> => {
  const data = await dbFetch<DbBurn[]>(`/rest/v1/burns`, {
    method: "POST",
    body: JSON.stringify(burn),
    headers: { Prefer: "return=representation" },
  });
  return data?.[0] ?? null;
};

// ─── Leaderboard ─────────────────────────────────────────────
export interface DbLeaderboardEntry {
  id: string;
  wallet_address: string;
  display_name: string | null;
  tokens_created: number;
  total_burned: string;
  total_swaps: number;
  rewards_earned: string;
  score: number;
  rank: number;
  category: string;
}

export const fetchLeaderboard = async (
  category = "creators",
  network = "devnet",
  limit = 20
): Promise<DbLeaderboardEntry[]> => {
  const data = await dbFetch<DbLeaderboardEntry[]>(
    `/rest/v1/leaderboard?category=eq.${category}&network=eq.${network}&order=rank.asc&limit=${limit}&select=*`
  );
  return data ?? [];
};

// ─── Token Holders ───────────────────────────────────────────
export interface DbTokenHolder {
  id: string;
  holder_address: string;
  balance: string;
  percentage: number;
}

export const fetchTokenHolders = async (tokenId: string): Promise<DbTokenHolder[]> => {
  const data = await dbFetch<DbTokenHolder[]>(
    `/rest/v1/token_holders?token_id=eq.${tokenId}&order=percentage.desc&select=*`
  );
  return data ?? [];
};

// ─── Swap History ────────────────────────────────────────────
export const createSwapRecord = async (swap: {
  user_address: string;
  token_in_symbol: string;
  token_out_symbol: string;
  amount_in: string;
  amount_out: string;
  price_impact: number;
  transaction_hash: string;
  network: string;
}) => {
  return dbFetch(`/rest/v1/swap_history`, {
    method: "POST",
    body: JSON.stringify(swap),
  });
};

// ─── Price History ───────────────────────────────────────────
export interface DbPricePoint {
  price_in_gyds: number;
  volume: string;
  timestamp: string;
}

export const fetchPriceHistory = async (tokenId: string, days = 30): Promise<DbPricePoint[]> => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const data = await dbFetch<DbPricePoint[]>(
    `/rest/v1/price_history?token_id=eq.${tokenId}&timestamp=gte.${since.toISOString()}&order=timestamp.asc&select=price_in_gyds,volume,timestamp`
  );
  return data ?? [];
};

// ─── Helpers: Convert DB types to app types ──────────────────
export const dbTokenToDeployedToken = (t: DbToken): DeployedToken => ({
  name: t.name,
  symbol: t.symbol,
  decimals: t.decimals,
  totalSupply: t.total_supply,
  currentSupply: t.current_supply,
  description: t.description ?? "",
  logoUrl: t.logo_url ?? "",
  website: t.website ?? undefined,
  twitter: t.twitter ?? undefined,
  telegram: t.telegram ?? undefined,
  contractAddress: t.contract_address ?? "",
  transactionHash: t.transaction_hash ?? "",
  creator: t.creator_address,
  createdAt: t.created_at,
  isPaused: t.is_paused,
});

export const dbTransactionToTransaction = (t: DbTransaction): Transaction => ({
  hash: t.hash,
  type: t.type as Transaction["type"],
  tokenSymbol: t.token_symbol,
  amount: t.amount ?? undefined,
  timestamp: t.created_at,
  status: t.status as Transaction["status"],
});
