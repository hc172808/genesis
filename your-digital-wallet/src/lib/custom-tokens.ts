export interface CustomToken {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  color: string;
  /** Chain ID where this token lives (1 = Ethereum, 137 = Polygon, 13370 = GYDS). Defaults to active chain when missing. */
  chainId?: number;
}

const STORAGE_KEY = "gyds_custom_tokens";

const GRADIENT_COLORS = [
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-yellow-500",
  "from-lime-400 to-green-500",
  "from-teal-400 to-emerald-500",
  "from-sky-400 to-blue-500",
  "from-orange-400 to-red-500",
  "from-fuchsia-400 to-pink-500",
];

export const getCustomTokens = (): CustomToken[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const sameToken = (a: CustomToken, b: CustomToken): boolean =>
  a.contractAddress.toLowerCase() === b.contractAddress.toLowerCase() &&
  (a.chainId ?? 0) === (b.chainId ?? 0);

/**
 * Save a token. Duplicate detection treats (contractAddress + chainId) as the
 * unique key — re-importing the same token on the same chain is a no-op and
 * never overwrites a fetched balance. The same contract on a different chain
 * is a separate entry.
 */
export const saveCustomToken = (token: CustomToken): { added: boolean; duplicate: boolean } => {
  const tokens = getCustomTokens();
  const existing = tokens.findIndex((t) => sameToken(t, token));
  if (existing >= 0) {
    // Preserve existing entry; only fill in missing metadata fields.
    const cur = tokens[existing];
    tokens[existing] = {
      ...cur,
      name: cur.name || token.name,
      decimals: cur.decimals || token.decimals,
      color: cur.color || token.color,
      chainId: cur.chainId ?? token.chainId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    return { added: false, duplicate: true };
  }
  tokens.push(token);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  return { added: true, duplicate: false };
};

export const removeCustomToken = (contractAddress: string, chainId?: number): void => {
  const tokens = getCustomTokens().filter((t) => {
    const sameAddr = t.contractAddress.toLowerCase() === contractAddress.toLowerCase();
    if (!sameAddr) return true;
    // If chainId provided, only remove the matching chain entry.
    if (chainId !== undefined) return (t.chainId ?? 0) !== chainId;
    return false;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
};

export const getRandomColor = (): string => {
  return GRADIENT_COLORS[Math.floor(Math.random() * GRADIENT_COLORS.length)];
};

/** Human-readable chain label, used by the Assets list badge. */
export const getChainLabel = (chainId?: number): string => {
  switch (chainId) {
    case 1: return "Ethereum";
    case 137: return "Polygon";
    case 13370: return "GYDS";
    case 56: return "BNB";
    case 42161: return "Arbitrum";
    case 10: return "Optimism";
    default: return chainId ? `Chain ${chainId}` : "GYDS";
  }
};
