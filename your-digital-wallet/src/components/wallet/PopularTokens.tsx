import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CoinIcon from "./CoinIcon";
import CategoryTabs from "./CategoryTabs";
import { getTokensByCategory, type TokenCategory, type CategorizedToken } from "@/lib/token-categories";

const PopularTokens = () => {
  const [category, setCategory] = useState<TokenCategory>("popular");
  const navigate = useNavigate();
  const tokens = getTokensByCategory(category);

  const fmt = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    if (n >= 1) return `$${n.toFixed(2)}`;
    if (n >= 0.01) return `$${n.toFixed(4)}`;
    return `$${n.toFixed(8)}`;
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
        Explore Tokens
      </h2>
      <CategoryTabs active={category} onChange={setCategory} />
      <div className="mt-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {tokens.slice(0, 10).map((token, i) => (
            <motion.button
              key={token.symbol}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/token/${token.symbol}`)}
              className="w-full flex items-center gap-3 p-3 bg-card rounded-xl hover:bg-card/80 transition-colors"
            >
              <CoinIcon symbol={token.symbol} size={36} />
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{token.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">{token.name}</span>
                </div>
                {token.marketCap && (
                  <span className="text-[10px] text-muted-foreground/60">MCap: {token.marketCap}</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium text-foreground">
                  {token.price ? fmt(token.price) : "-"}
                </div>
                {token.change24h !== undefined && token.change24h !== 0 && (
                  <div className={`flex items-center justify-end gap-0.5 text-xs ${
                    token.change24h >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    {token.change24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(token.change24h).toFixed(1)}%
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PopularTokens;
