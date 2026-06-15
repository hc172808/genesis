/**
 * DEX Router client for GydsChain.
 *
 * Implements the standard Uniswap V2 router interface for CPMM pools, plus
 * a minimal Uniswap V4-style PoolManager interface for "AMM v4" pools.
 *
 * All transaction-building helpers return ABI-encoded calldata; submit them
 * via the wallet adapter (`sendTransaction`).
 *
 * Fee split: 84% LP / 16% protocol — handled by the router contract on-chain
 * (configured at deployment via `setFeeTo` + `setFeeBps`). See dexConfig.ts.
 */

import { activeConfig } from "./config";
import { rpcCall } from "./rpcClient";
import { sendTransaction, type EthereumProvider } from "./walletAdapter";
import { encodeApproveCall } from "./erc20Factory";
import { getDexAddresses, type DexAddresses } from "./dexConfig";

// ─── ABI selectors (Uniswap V2 Router) ────────────────────────
//   addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)
const SEL_ADD_LIQUIDITY = "0xe8e33700";
//   addLiquidityETH(address,uint256,uint256,uint256,address,uint256)        — payable
const SEL_ADD_LIQUIDITY_ETH = "0xf305d719";
//   removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)
const SEL_REMOVE_LIQUIDITY = "0xbaa2abde";
//   removeLiquidityETH(address,uint256,uint256,uint256,address,uint256)
const SEL_REMOVE_LIQUIDITY_ETH = "0x02751cec";
//   swapExactTokensForTokens(uint256,uint256,address[],address,uint256)
const SEL_SWAP_EXACT_TOKENS = "0x38ed1739";
//   swapExactETHForTokens(uint256,address[],address,uint256)               — payable
const SEL_SWAP_EXACT_ETH_FOR_TOKENS = "0x7ff36ab5";
//   swapExactTokensForETH(uint256,uint256,address[],address,uint256)
const SEL_SWAP_EXACT_TOKENS_FOR_ETH = "0x18cbafe5";

// ─── Factory selectors ────────────────────────────────────────
//   getPair(address,address)
const SEL_GET_PAIR = "0xe6a43905";
//   createPair(address,address)
const SEL_CREATE_PAIR = "0xc9c65396";

// ─── AMM v4 selectors (Uniswap V4 PoolManager) ────────────────
//   initialize((address,address,uint24,int24,address),uint160) returns (int24)
const SEL_V4_INITIALIZE = "0x695c5bf5";

// ─── Encoders ─────────────────────────────────────────────────
const padAddress = (addr: string): string =>
  addr.replace(/^0x/, "").toLowerCase().padStart(64, "0");

const padUint = (value: bigint | string | number): string => {
  const v = typeof value === "bigint" ? value : BigInt(value);
  return v.toString(16).padStart(64, "0");
};

export const toWei = (amount: string | number, decimals = 18): bigint => {
  const [whole, frac = ""] = String(amount).split(".");
  const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole || "0") * BigInt(10) ** BigInt(decimals) + BigInt(fracPadded || "0");
};

export const fromWei = (wei: bigint | string, decimals = 18, displayDecimals = 6): string => {
  const w = typeof wei === "bigint" ? wei : BigInt(wei);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = w / base;
  const frac = w % base;
  return `${whole}.${frac.toString().padStart(decimals, "0").slice(0, displayDecimals)}`;
};

const deadlineFromNow = (minutes = 20): bigint =>
  BigInt(Math.floor(Date.now() / 1000) + minutes * 60);

// ─── Encode: addLiquidity (token + token) ─────────────────────
export const encodeAddLiquidity = (params: {
  tokenA: string;
  tokenB: string;
  amountADesired: bigint;
  amountBDesired: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  to: string;
  deadline?: bigint;
}): string => {
  return (
    SEL_ADD_LIQUIDITY +
    padAddress(params.tokenA) +
    padAddress(params.tokenB) +
    padUint(params.amountADesired) +
    padUint(params.amountBDesired) +
    padUint(params.amountAMin) +
    padUint(params.amountBMin) +
    padAddress(params.to) +
    padUint(params.deadline ?? deadlineFromNow())
  );
};

// ─── Encode: addLiquidityETH (token + native GYDS) ────────────
export const encodeAddLiquidityETH = (params: {
  token: string;
  amountTokenDesired: bigint;
  amountTokenMin: bigint;
  amountETHMin: bigint;
  to: string;
  deadline?: bigint;
}): string => {
  return (
    SEL_ADD_LIQUIDITY_ETH +
    padAddress(params.token) +
    padUint(params.amountTokenDesired) +
    padUint(params.amountTokenMin) +
    padUint(params.amountETHMin) +
    padAddress(params.to) +
    padUint(params.deadline ?? deadlineFromNow())
  );
};

// ─── Encode: removeLiquidity ──────────────────────────────────
export const encodeRemoveLiquidity = (params: {
  tokenA: string;
  tokenB: string;
  liquidity: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  to: string;
  deadline?: bigint;
}): string => {
  return (
    SEL_REMOVE_LIQUIDITY +
    padAddress(params.tokenA) +
    padAddress(params.tokenB) +
    padUint(params.liquidity) +
    padUint(params.amountAMin) +
    padUint(params.amountBMin) +
    padAddress(params.to) +
    padUint(params.deadline ?? deadlineFromNow())
  );
};

// ─── Encode: swapExactTokensForTokens / ETH variants ──────────
const encodeSwapWithPath = (
  selector: string,
  amountIn: bigint | null, // null when payable (uses msg.value)
  amountOutMin: bigint,
  path: string[],
  to: string,
  deadline: bigint
): string => {
  // For payable swaps, the amountIn is omitted and pathOffset shifts.
  if (amountIn === null) {
    // swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)
    const pathOffset = padUint(BigInt(4 * 32)); // 4 fixed-size slots before dynamic
    const pathLength = padUint(BigInt(path.length));
    const pathData = path.map(padAddress).join("");
    return (
      selector +
      padUint(amountOutMin) +
      pathOffset +
      padAddress(to) +
      padUint(deadline) +
      pathLength +
      pathData
    );
  }
  // swapExactTokensForTokens / swapExactTokensForETH (5 fixed slots before dynamic)
  const pathOffset = padUint(BigInt(5 * 32));
  const pathLength = padUint(BigInt(path.length));
  const pathData = path.map(padAddress).join("");
  return (
    selector +
    padUint(amountIn) +
    padUint(amountOutMin) +
    pathOffset +
    padAddress(to) +
    padUint(deadline) +
    pathLength +
    pathData
  );
};

export const encodeSwapExactTokensForTokens = (params: {
  amountIn: bigint;
  amountOutMin: bigint;
  path: string[];
  to: string;
  deadline?: bigint;
}): string =>
  encodeSwapWithPath(
    SEL_SWAP_EXACT_TOKENS,
    params.amountIn,
    params.amountOutMin,
    params.path,
    params.to,
    params.deadline ?? deadlineFromNow()
  );

export const encodeSwapExactETHForTokens = (params: {
  amountOutMin: bigint;
  path: string[];
  to: string;
  deadline?: bigint;
}): string =>
  encodeSwapWithPath(
    SEL_SWAP_EXACT_ETH_FOR_TOKENS,
    null,
    params.amountOutMin,
    params.path,
    params.to,
    params.deadline ?? deadlineFromNow()
  );

export const encodeSwapExactTokensForETH = (params: {
  amountIn: bigint;
  amountOutMin: bigint;
  path: string[];
  to: string;
  deadline?: bigint;
}): string =>
  encodeSwapWithPath(
    SEL_SWAP_EXACT_TOKENS_FOR_ETH,
    params.amountIn,
    params.amountOutMin,
    params.path,
    params.to,
    params.deadline ?? deadlineFromNow()
  );

// ─── Read helpers ─────────────────────────────────────────────
export const getPairAddress = async (
  tokenA: string,
  tokenB: string
): Promise<string | null> => {
  const dex = getDexAddresses();
  if (!dex) return null;
  try {
    const data = SEL_GET_PAIR + padAddress(tokenA) + padAddress(tokenB);
    const result = await rpcCall<string>({
      method: "eth_call",
      params: [{ to: dex.factory, data }, "latest"],
    });
    const addr = "0x" + result.slice(-40);
    return addr === "0x0000000000000000000000000000000000000000" ? null : addr;
  } catch {
    return null;
  }
};

// ─── High-level transaction submitters ────────────────────────
export interface ApproveAndCallParams {
  provider: EthereumProvider;
  from: string;
  token: string;
  spender: string;
  amount: bigint;
  decimals?: number;
}

/** Approve `spender` to spend `amount` of `token` (skips if already sufficient). */
export const approveIfNeeded = async (params: ApproveAndCallParams): Promise<string | null> => {
  // Read existing allowance first
  // allowance(address,address) = 0xdd62ed3e
  const data =
    "0xdd62ed3e" + padAddress(params.from) + padAddress(params.spender);
  let current: bigint = 0n;
  try {
    const hex = await rpcCall<string>({
      method: "eth_call",
      params: [{ to: params.token, data }, "latest"],
    });
    current = BigInt(hex);
  } catch {
    current = 0n;
  }
  if (current >= params.amount) return null;

  // Encode approve(spender, amount) — bypass erc20Factory's decimal-aware version
  const approveData =
    "0x095ea7b3" + padAddress(params.spender) + padUint(params.amount);
  return await sendTransaction(params.provider, {
    from: params.from,
    to: params.token,
    data: approveData,
  });
};

/** Add liquidity for token + native GYDS. Returns tx hash. */
export const addLiquidityNative = async (params: {
  provider: EthereumProvider;
  from: string;
  token: string;
  tokenAmount: bigint;
  gydsAmount: bigint;
  slippageBps?: number; // default 50 = 0.5%
  decimals?: number;
}): Promise<string> => {
  const dex = getDexAddresses();
  if (!dex) throw new Error("DEX is not deployed on this network. Ask the admin to deploy it.");

  const slip = params.slippageBps ?? 50;
  const tokenMin = (params.tokenAmount * BigInt(10000 - slip)) / 10000n;
  const gydsMin = (params.gydsAmount * BigInt(10000 - slip)) / 10000n;

  await approveIfNeeded({
    provider: params.provider,
    from: params.from,
    token: params.token,
    spender: dex.router,
    amount: params.tokenAmount,
  });

  const data = encodeAddLiquidityETH({
    token: params.token,
    amountTokenDesired: params.tokenAmount,
    amountTokenMin: tokenMin,
    amountETHMin: gydsMin,
    to: params.from,
  });

  return await sendTransaction(params.provider, {
    from: params.from,
    to: dex.router,
    data,
    value: "0x" + params.gydsAmount.toString(16),
  });
};

/** Swap GYDS → token. */
export const swapNativeForToken = async (params: {
  provider: EthereumProvider;
  from: string;
  token: string;
  gydsIn: bigint;
  minTokenOut: bigint;
}): Promise<string> => {
  const dex = getDexAddresses();
  if (!dex) throw new Error("DEX is not deployed on this network.");

  const data = encodeSwapExactETHForTokens({
    amountOutMin: params.minTokenOut,
    path: [dex.wgyds, params.token],
    to: params.from,
  });

  return await sendTransaction(params.provider, {
    from: params.from,
    to: dex.router,
    data,
    value: "0x" + params.gydsIn.toString(16),
  });
};

/** Swap token → GYDS. */
export const swapTokenForNative = async (params: {
  provider: EthereumProvider;
  from: string;
  token: string;
  tokenIn: bigint;
  minGydsOut: bigint;
}): Promise<string> => {
  const dex = getDexAddresses();
  if (!dex) throw new Error("DEX is not deployed on this network.");

  await approveIfNeeded({
    provider: params.provider,
    from: params.from,
    token: params.token,
    spender: dex.router,
    amount: params.tokenIn,
  });

  const data = encodeSwapExactTokensForETH({
    amountIn: params.tokenIn,
    amountOutMin: params.minGydsOut,
    path: [params.token, dex.wgyds],
    to: params.from,
  });

  return await sendTransaction(params.provider, {
    from: params.from,
    to: dex.router,
    data,
  });
};

/** Swap token → token via WGYDS hop. */
export const swapTokenForToken = async (params: {
  provider: EthereumProvider;
  from: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
}): Promise<string> => {
  const dex = getDexAddresses();
  if (!dex) throw new Error("DEX is not deployed on this network.");

  await approveIfNeeded({
    provider: params.provider,
    from: params.from,
    token: params.tokenIn,
    spender: dex.router,
    amount: params.amountIn,
  });

  // Direct path if a pair exists, otherwise route via WGYDS
  const direct = await getPairAddress(params.tokenIn, params.tokenOut);
  const path = direct
    ? [params.tokenIn, params.tokenOut]
    : [params.tokenIn, dex.wgyds, params.tokenOut];

  const data = encodeSwapExactTokensForTokens({
    amountIn: params.amountIn,
    amountOutMin: params.minAmountOut,
    path,
    to: params.from,
  });

  return await sendTransaction(params.provider, {
    from: params.from,
    to: dex.router,
    data,
  });
};

/** Remove liquidity from a token-GYDS pair. */
export const removeLiquidity = async (params: {
  provider: EthereumProvider;
  from: string;
  pairAddress: string;
  tokenA: string;
  tokenB: string;
  liquidity: bigint;
  minA: bigint;
  minB: bigint;
}): Promise<string> => {
  const dex = getDexAddresses();
  if (!dex) throw new Error("DEX is not deployed on this network.");

  // Approve LP tokens to router
  await approveIfNeeded({
    provider: params.provider,
    from: params.from,
    token: params.pairAddress,
    spender: dex.router,
    amount: params.liquidity,
  });

  const data = encodeRemoveLiquidity({
    tokenA: params.tokenA,
    tokenB: params.tokenB,
    liquidity: params.liquidity,
    amountAMin: params.minA,
    amountBMin: params.minB,
    to: params.from,
  });

  return await sendTransaction(params.provider, {
    from: params.from,
    to: dex.router,
    data,
  });
};

/** Re-export the addresses helper for convenience. */
export { getDexAddresses };
export type { DexAddresses };
export { activeConfig };
