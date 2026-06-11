/**
 * Solana balance fetcher using @solana/web3.js
 * Fetches SOL native balance and SPL token balances
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";

// Well-known SPL token mints on Solana mainnet
export const KNOWN_SPL_TOKENS: Record<string, {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  color: string;
}> = {
  USDC: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    color: "from-blue-500 to-cyan-400",
  },
  USDT: {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    symbol: "USDT",
    name: "Tether",
    decimals: 6,
    color: "from-emerald-400 to-green-500",
  },
  BONK: {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    name: "Bonk",
    decimals: 5,
    color: "from-orange-400 to-yellow-400",
  },
  WIF: {
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    symbol: "WIF",
    name: "Dogwifhat",
    decimals: 6,
    color: "from-pink-400 to-rose-500",
  },
  JUP: {
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    symbol: "JUP",
    name: "Jupiter",
    decimals: 6,
    color: "from-lime-400 to-green-500",
  },
  RAY: {
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    symbol: "RAY",
    name: "Raydium",
    decimals: 6,
    color: "from-purple-400 to-blue-500",
  },
  PYTH: {
    mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    symbol: "PYTH",
    name: "Pyth Network",
    decimals: 6,
    color: "from-violet-400 to-purple-600",
  },
  ORCA: {
    mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    symbol: "ORCA",
    name: "Orca",
    decimals: 6,
    color: "from-amber-300 to-yellow-500",
  },
};

let _connection: Connection | null = null;

function getConnection(useDevnet = false): Connection {
  if (!_connection) {
    _connection = new Connection(useDevnet ? SOLANA_DEVNET_RPC : SOLANA_RPC, "confirmed");
  }
  return _connection;
}

/**
 * Check if a string looks like a Solana address (base58, 32-44 chars)
 */
export function isSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Fetch native SOL balance
 */
export async function fetchSolBalance(address: string): Promise<string> {
  try {
    const conn = getConnection();
    const pubkey = new PublicKey(address);
    const lamports = await conn.getBalance(pubkey);
    const sol = lamports / LAMPORTS_PER_SOL;
    if (sol === 0) return "0";
    return sol < 0.0001 ? sol.toExponential(2) : sol.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  } catch {
    return "0";
  }
}

/**
 * Fetch all SPL token balances for an address
 */
export async function fetchSplTokenBalances(
  address: string
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  try {
    const conn = getConnection();
    const pubkey = new PublicKey(address);

    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

    // Build reverse lookup: mint → symbol
    const mintToSymbol: Record<string, { symbol: string; decimals: number }> = {};
    for (const [sym, info] of Object.entries(KNOWN_SPL_TOKENS)) {
      mintToSymbol[info.mint] = { symbol: info.symbol, decimals: info.decimals };
    }

    for (const { account } of tokenAccounts.value) {
      const parsed = account.data.parsed?.info;
      if (!parsed) continue;

      const mint: string = parsed.mint;
      const amount = parsed.tokenAmount;

      if (amount && parseFloat(amount.uiAmountString || "0") > 0) {
        const known = mintToSymbol[mint];
        if (known) {
          results[known.symbol] = amount.uiAmountString;
        } else {
          // Unknown SPL token — store by mint (first 8 chars)
          results[`SPL_${mint.slice(0, 8)}`] = amount.uiAmountString;
        }
      }
    }
  } catch {
    // silent — RPC may rate limit
  }

  return results;
}

/**
 * Fetch both SOL and SPL balances in one call
 */
export async function fetchAllSolanaBalances(
  address: string
): Promise<{ sol: string; tokens: Record<string, string> }> {
  const [sol, tokens] = await Promise.all([
    fetchSolBalance(address),
    fetchSplTokenBalances(address),
  ]);
  return { sol, tokens };
}
