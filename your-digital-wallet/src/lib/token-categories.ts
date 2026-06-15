export type TokenCategory = 
  | "popular" | "meme" | "ai" | "x404" | "commodities" 
  | "meme-rush" | "perps" | "prediction" | "alpha" | "all";

export interface CategorizedToken {
  symbol: string;
  name: string;
  category: TokenCategory[];
  color: string;
  price?: number;
  change24h?: number;
  marketCap?: string;
  volume24h?: string;
}

export const TOKEN_CATEGORIES: { id: TokenCategory; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "🌐" },
  { id: "popular", label: "Popular", icon: "🔥" },
  { id: "meme", label: "Meme", icon: "🐸" },
  { id: "ai", label: "AI", icon: "🤖" },
  { id: "x404", label: "x404", icon: "💎" },
  { id: "commodities", label: "Commodities", icon: "🪙" },
  { id: "meme-rush", label: "Meme Rush", icon: "🚀" },
  { id: "perps", label: "Perps", icon: "📈" },
  { id: "prediction", label: "Prediction", icon: "🔮" },
  { id: "alpha", label: "Alpha", icon: "⚡" },
];

export const CATEGORIZED_TOKENS: CategorizedToken[] = [
  // Popular
  { symbol: "BTC", name: "Bitcoin", category: ["popular", "perps"], color: "from-amber-500 to-orange-500", price: 67500, change24h: 2.4, marketCap: "$1.3T", volume24h: "$28B" },
  { symbol: "ETH", name: "Ethereum", category: ["popular", "perps", "x404"], color: "from-blue-400 to-indigo-500", price: 3450, change24h: 1.8, marketCap: "$415B", volume24h: "$15B" },
  { symbol: "SOL", name: "Solana", category: ["popular", "perps"], color: "from-purple-500 to-fuchsia-500", price: 178, change24h: 5.2, marketCap: "$82B", volume24h: "$4.2B" },
  { symbol: "GYDS", name: "GYDS", category: ["popular"], color: "from-cyan-400 to-teal-500", price: 0.15, change24h: 12.5, marketCap: "$15M", volume24h: "$2.1M" },
  
  // Meme
  { symbol: "DOGE", name: "Dogecoin", category: ["meme", "popular", "meme-rush"], color: "from-yellow-400 to-amber-500", price: 0.165, change24h: 8.3, marketCap: "$24B", volume24h: "$1.8B" },
  { symbol: "SHIB", name: "Shiba Inu", category: ["meme", "meme-rush"], color: "from-orange-500 to-red-400", price: 0.0000245, change24h: -2.1, marketCap: "$14B", volume24h: "$890M" },
  { symbol: "PEPE", name: "Pepe", category: ["meme", "meme-rush", "popular"], color: "from-green-500 to-lime-400", price: 0.0000135, change24h: 15.7, marketCap: "$5.7B", volume24h: "$1.2B" },
  { symbol: "FLOKI", name: "Floki", category: ["meme", "meme-rush"], color: "from-amber-400 to-yellow-500", price: 0.000198, change24h: 6.4, marketCap: "$1.9B", volume24h: "$320M" },
  { symbol: "BONK", name: "Bonk", category: ["meme", "meme-rush"], color: "from-orange-400 to-yellow-400", price: 0.0000298, change24h: 11.2, marketCap: "$2.1B", volume24h: "$450M" },
  { symbol: "WIF", name: "Dogwifhat", category: ["meme", "meme-rush"], color: "from-pink-400 to-rose-500", price: 2.85, change24h: -4.3, marketCap: "$2.8B", volume24h: "$380M" },
  
  // AI
  { symbol: "FET", name: "Fetch.ai", category: ["ai", "alpha"], color: "from-indigo-400 to-blue-600", price: 2.35, change24h: 7.8, marketCap: "$6.1B", volume24h: "$520M" },
  { symbol: "RNDR", name: "Render", category: ["ai", "alpha"], color: "from-red-500 to-orange-500", price: 10.45, change24h: 4.2, marketCap: "$5.4B", volume24h: "$410M" },
  { symbol: "TAO", name: "Bittensor", category: ["ai", "alpha"], color: "from-slate-400 to-zinc-600", price: 415, change24h: 9.1, marketCap: "$3.1B", volume24h: "$180M" },
  { symbol: "NEAR", name: "NEAR Protocol", category: ["ai", "popular"], color: "from-emerald-400 to-teal-600", price: 7.25, change24h: 3.5, marketCap: "$8.2B", volume24h: "$620M" },
  { symbol: "OCEAN", name: "Ocean Protocol", category: ["ai"], color: "from-blue-400 to-cyan-500", price: 0.92, change24h: 5.6, marketCap: "$680M", volume24h: "$85M" },
  
  // x404
  { symbol: "PANDORA", name: "Pandora", category: ["x404"], color: "from-violet-500 to-purple-600", price: 2850, change24h: -1.2, marketCap: "$28M", volume24h: "$4.5M" },
  { symbol: "DN404", name: "DN-404", category: ["x404"], color: "from-pink-500 to-violet-500", price: 145, change24h: 22.5, marketCap: "$14M", volume24h: "$2.8M" },
  
  // Commodities
  { symbol: "PAXG", name: "PAX Gold", category: ["commodities"], color: "from-yellow-500 to-amber-600", price: 2420, change24h: 0.3, marketCap: "$480M", volume24h: "$12M" },
  { symbol: "XAUt", name: "Tether Gold", category: ["commodities"], color: "from-yellow-400 to-orange-500", price: 2418, change24h: 0.2, marketCap: "$580M", volume24h: "$18M" },
  
  // Perps
  { symbol: "GMX", name: "GMX", category: ["perps"], color: "from-blue-500 to-indigo-600", price: 38.5, change24h: 2.8, marketCap: "$370M", volume24h: "$25M" },
  { symbol: "DYDX", name: "dYdX", category: ["perps"], color: "from-purple-400 to-indigo-500", price: 2.15, change24h: -0.5, marketCap: "$640M", volume24h: "$45M" },
  
  // Prediction
  { symbol: "POLY", name: "Polymarket", category: ["prediction"], color: "from-blue-400 to-sky-500", price: 0.0, change24h: 0, marketCap: "-", volume24h: "-" },
  { symbol: "GNO", name: "Gnosis", category: ["prediction", "popular"], color: "from-teal-400 to-emerald-500", price: 345, change24h: 1.9, marketCap: "$890M", volume24h: "$15M" },
  
  // Alpha
  { symbol: "EIGEN", name: "EigenLayer", category: ["alpha"], color: "from-indigo-400 to-violet-500", price: 4.85, change24h: 18.3, marketCap: "$890M", volume24h: "$120M" },
  { symbol: "STRK", name: "Starknet", category: ["alpha"], color: "from-blue-500 to-purple-500", price: 1.25, change24h: 6.7, marketCap: "$1.1B", volume24h: "$95M" },
  { symbol: "ZRO", name: "LayerZero", category: ["alpha"], color: "from-cyan-400 to-blue-500", price: 3.45, change24h: 8.9, marketCap: "$380M", volume24h: "$65M" },
];

export const getTokensByCategory = (category: TokenCategory): CategorizedToken[] => {
  if (category === "all") return CATEGORIZED_TOKENS;
  return CATEGORIZED_TOKENS.filter(t => t.category.includes(category));
};
