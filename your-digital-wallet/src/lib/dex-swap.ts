import { ethers } from "ethers";
import { fetchPrices } from "./price-fetcher";
import { getActiveRpc } from "./network-config";

export interface SwapToken {
  symbol: string;
  name: string;
  contractAddress: string | null;
  decimals: number;
  color: string;
}

export interface SwapQuote {
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
  rate: string;
  priceImpact: number;
  fee: number;
  minimumReceived: string;
  route: string;
}

export const SWAP_TOKENS: SwapToken[] = [
  { symbol: "GYDS", name: "GYDS (Native)", contractAddress: null, decimals: 18, color: "from-cyan-400 to-teal-500" },
  { symbol: "GYD", name: "GYD Stablecoin", contractAddress: null, decimals: 6, color: "from-sky-400 to-cyan-500" },
  { symbol: "ETH", name: "Ethereum", contractAddress: null, decimals: 18, color: "from-blue-400 to-indigo-500" },
  { symbol: "USDT", name: "Tether", contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, color: "from-emerald-400 to-green-500" },
  { symbol: "USDC", name: "USD Coin", contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, color: "from-blue-500 to-cyan-400" },
  { symbol: "DAI", name: "Dai Stablecoin", contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, color: "from-amber-400 to-yellow-500" },
  { symbol: "BTC", name: "Bitcoin", contractAddress: null, decimals: 8, color: "from-amber-500 to-orange-500" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", contractAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8, color: "from-orange-400 to-amber-600" },
  { symbol: "SOL", name: "Solana", contractAddress: null, decimals: 9, color: "from-purple-500 to-fuchsia-500" },
  { symbol: "AVAX", name: "Avalanche", contractAddress: null, decimals: 18, color: "from-red-400 to-rose-500" },
  { symbol: "MATIC", name: "Polygon", contractAddress: null, decimals: 18, color: "from-violet-500 to-purple-500" },
  { symbol: "LINK", name: "Chainlink", contractAddress: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18, color: "from-blue-600 to-indigo-400" },
  { symbol: "UNI", name: "Uniswap", contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18, color: "from-pink-500 to-rose-400" },
  { symbol: "AAVE", name: "Aave", contractAddress: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", decimals: 18, color: "from-purple-400 to-indigo-500" },
  { symbol: "CRV", name: "Curve DAO", contractAddress: "0xD533a949740bb3306d119CC777fa900bA034cd52", decimals: 18, color: "from-yellow-500 to-red-500" },
];

// Fetch live prices from CoinGecko
export const fetchSwapPrices = async (): Promise<Record<string, number>> => {
  const symbols = SWAP_TOKENS.map((t) => t.symbol);
  const prices = await fetchPrices(symbols);
  const result: Record<string, number> = {};
  for (const s of symbols) {
    result[s] = prices[s]?.usd ?? 0;
  }
  // Fallbacks for native tokens
  if (!result["GYDS"]) result["GYDS"] = 0.15;
  if (!result["GYD"]) result["GYD"] = 1.0;
  return result;
};

// Calculate swap quote using live prices
export const getSwapQuote = (
  fromToken: SwapToken,
  toToken: SwapToken,
  fromAmount: string,
  prices: Record<string, number>,
  slippage: number
): SwapQuote | null => {
  const amount = parseFloat(fromAmount);
  if (!amount || amount <= 0) return null;

  const fromPrice = prices[fromToken.symbol] ?? 0;
  const toPrice = prices[toToken.symbol] ?? 0;
  if (!fromPrice || !toPrice) return null;

  const rate = fromPrice / toPrice;
  const fee = 0.003; // 0.3%
  const rawToAmount = amount * rate;
  const toAmountAfterFee = rawToAmount * (1 - fee);
  const minimumReceived = toAmountAfterFee * (1 - slippage / 100);

  // Simulate price impact based on amount
  const priceImpact = Math.min(amount * fromPrice * 0.00001, 5);

  return {
    fromToken,
    toToken,
    fromAmount,
    toAmount: toAmountAfterFee.toFixed(6),
    rate: rate.toFixed(6),
    priceImpact: parseFloat(priceImpact.toFixed(2)),
    fee: parseFloat((rawToAmount * fee).toFixed(6)),
    minimumReceived: minimumReceived.toFixed(6),
    route: `${fromToken.symbol} → ${toToken.symbol}`,
  };
};

// Execute a swap transaction via the wallet.
// GYDS ↔ GYD are native chain pairs handled on-chain via the GYDS router.
// All other pairs require an external DEX (Uniswap, 1inch, etc.) — use the dApp Browser.
export const executeSwap = async (
  wallet: ethers.Wallet,
  quote: SwapQuote
): Promise<string> => {
  const rpc = await getActiveRpc();
  if (!rpc) throw new Error("No RPC endpoint available");

  const nativePairs = new Set(["GYDS", "GYD"]);
  const isNativePair =
    nativePairs.has(quote.fromToken.symbol) && nativePairs.has(quote.toToken.symbol);

  if (!isNativePair) {
    throw new Error(
      `Swapping ${quote.fromToken.symbol} → ${quote.toToken.symbol} requires an on-chain DEX router. ` +
      `Open the dApp Browser and use Uniswap or 1inch to complete this trade.`
    );
  }

  // GYDS ↔ GYD native swap: broadcast a tagged transaction to the network.
  // A bridge contract or validator picks this up and issues the counterpart token.
  const provider = new ethers.JsonRpcProvider(rpc);
  const connectedWallet = wallet.connect(provider);

  const tag = ethers.hexlify(
    ethers.toUtf8Bytes(
      `GYDS_SWAP:${quote.fromToken.symbol}:${quote.toToken.symbol}:${quote.fromAmount}:${quote.toAmount}`
    )
  );

  const tx = await connectedWallet.sendTransaction({
    to: connectedWallet.address,
    value: ethers.parseUnits(quote.fromAmount, quote.fromToken.decimals),
    data: tag,
  });
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
};
