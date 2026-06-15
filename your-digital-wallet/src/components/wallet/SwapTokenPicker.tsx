import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import CoinIcon from "@/components/wallet/CoinIcon";
import { SWAP_TOKENS, type SwapToken } from "@/lib/dex-swap";
import { getCustomTokens } from "@/lib/custom-tokens";
import { formatPrice } from "@/lib/price-fetcher";

type NetworkId = "all" | "gyds" | "ethereum" | "polygon" | "solana";

interface NetworkTab {
  id: NetworkId;
  label: string;
  icon: string;
}

const NETWORKS: NetworkTab[] = [
  { id: "all", label: "All", icon: "🌐" },
  { id: "gyds", label: "GYDS", icon: "💎" },
  { id: "ethereum", label: "Ethereum", icon: "⟠" },
  { id: "polygon", label: "Polygon", icon: "⬡" },
  { id: "solana", label: "Solana", icon: "◎" },
];

// Map each token to the network(s) it belongs to
const TOKEN_NETWORK_MAP: Record<string, NetworkId[]> = {
  GYDS: ["gyds"],
  GYD: ["gyds"],
  ETH: ["ethereum"],
  USDT: ["ethereum", "polygon", "solana"],
  USDC: ["ethereum", "polygon", "solana"],
  DAI: ["ethereum", "polygon"],
  BTC: ["ethereum"],
  WBTC: ["ethereum", "polygon"],
  SOL: ["solana"],
  AVAX: ["ethereum"],
  MATIC: ["polygon"],
  LINK: ["ethereum", "polygon"],
  UNI: ["ethereum", "polygon"],
  AAVE: ["ethereum", "polygon"],
  CRV: ["ethereum"],
};

interface SwapTokenPickerProps {
  onSelect: (token: SwapToken) => void;
  onClose: () => void;
  exclude: string;
  prices: Record<string, number>;
}

const SwapTokenPicker = ({ onSelect, onClose, exclude, prices }: SwapTokenPickerProps) => {
  const [search, setSearch] = useState("");
  const [activeNetwork, setActiveNetwork] = useState<NetworkId>("all");

  // Merge SWAP_TOKENS + custom tokens
  const allTokens = useMemo(() => {
    const custom = getCustomTokens().map((ct) => ({
      symbol: ct.symbol,
      name: ct.name,
      contractAddress: ct.contractAddress,
      decimals: ct.decimals,
      color: ct.color,
    }));
    // Avoid duplicates
    const symbols = new Set(SWAP_TOKENS.map((t) => t.symbol));
    const extras = custom.filter((c) => !symbols.has(c.symbol));
    return [...SWAP_TOKENS, ...extras];
  }, []);

  const filteredTokens = useMemo(() => {
    let tokens = allTokens.filter((t) => t.symbol !== exclude);

    // Filter by network
    if (activeNetwork !== "all") {
      tokens = tokens.filter((t) => {
        const networks = TOKEN_NETWORK_MAP[t.symbol];
        // Custom tokens default to "all" networks
        if (!networks) return true;
        return networks.includes(activeNetwork);
      });
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      tokens = tokens.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
      );
    }

    return tokens;
  }, [allTokens, exclude, activeNetwork, search]);

  const handleSelect = (token: SwapToken) => {
    onSelect(token);
    onClose();
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-display font-bold text-foreground">Select Token</h2>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or symbol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-card rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border border-border focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Network tabs */}
      <div className="px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {NETWORKS.map((net) => (
            <button
              key={net.id}
              onClick={() => setActiveNetwork(net.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeNetwork === net.id
                  ? "gradient-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <span>{net.icon}</span>
              {net.label}
            </button>
          ))}
        </div>
      </div>

      {/* Token list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {filteredTokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No tokens found</p>
            <p className="text-xs mt-1">Try a different search or network</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTokens.map((token) => {
              const price = prices[token.symbol];
              const networkTags = TOKEN_NETWORK_MAP[token.symbol] || ["custom"];
              return (
                <button
                  key={token.symbol}
                  onClick={() => handleSelect(token)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-card active:bg-secondary/70 transition-colors"
                >
                  <CoinIcon symbol={token.symbol} size={40} fallbackColor={token.color} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{token.symbol}</p>
                      <div className="flex gap-1">
                        {networkTags.map((net) => (
                          <span
                            key={net}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize"
                          >
                            {net}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{token.name}</p>
                  </div>
                  <p className="text-sm text-foreground font-medium shrink-0">
                    {price ? formatPrice(price) : "—"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SwapTokenPicker;
