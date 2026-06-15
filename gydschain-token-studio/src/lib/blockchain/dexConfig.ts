/**
 * DEX deployment registry — stores the deployed Factory + Router + WGYDS
 * contract addresses for each network. Persisted in localStorage so admins
 * can deploy once and the whole app uses them.
 *
 * Per-network keying: addresses are stored under the chainId so devnet and
 * mainnet keep separate sets.
 */

import { activeConfig } from "./config";

export interface DexAddresses {
  factory: string;
  router: string;
  wgyds: string;
  /** Optional AMM v4 PoolManager (Uniswap v4 style). Falls back to router when absent. */
  v4PoolManager?: string;
  deployedAt: string;
  deployerAddress: string;
}

const STORAGE_KEY_PREFIX = "gyds_dex_addresses_";

const storageKey = (chainId: number): string =>
  `${STORAGE_KEY_PREFIX}${chainId}`;

export const getDexAddresses = (chainId?: number): DexAddresses | null => {
  if (typeof localStorage === "undefined") return null;
  const id = chainId ?? activeConfig.chainId;
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DexAddresses;
    // Sanity check
    if (!parsed.factory || !parsed.router || !parsed.wgyds) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveDexAddresses = (
  addresses: DexAddresses,
  chainId?: number
): void => {
  if (typeof localStorage === "undefined") return;
  const id = chainId ?? activeConfig.chainId;
  localStorage.setItem(storageKey(id), JSON.stringify(addresses));
};

export const clearDexAddresses = (chainId?: number): void => {
  if (typeof localStorage === "undefined") return;
  const id = chainId ?? activeConfig.chainId;
  localStorage.removeItem(storageKey(id));
};

export const isDexDeployed = (chainId?: number): boolean =>
  getDexAddresses(chainId) !== null;

/**
 * 84/16 fee split — 84% to LPs, 16% to protocol treasury.
 * Encoded in basis points for use in encoded swap calls.
 */
export const FEE_SPLIT = {
  lpBps: 8400, // 84%
  protocolBps: 1600, // 16%
} as const;

/**
 * Default LP fee tier (in basis points). 25 = 0.25%.
 * Other supported tiers: 1, 5, 25, 100.
 */
export const FEE_TIERS_BPS = [1, 5, 25, 100] as const;
export type FeeTierBps = (typeof FEE_TIERS_BPS)[number];

export const feePercentToBps = (pct: string | number): FeeTierBps => {
  const n = Math.round(Number(pct) * 100);
  return (FEE_TIERS_BPS.find((t) => t === n) ?? 25) as FeeTierBps;
};
