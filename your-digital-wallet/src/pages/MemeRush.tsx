import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp, TrendingDown, Trophy, Clock, Zap, ArrowLeft, Star } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import CoinIcon from "@/components/wallet/CoinIcon";

interface MemeToken {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: string;
  marketCap: string;
  rank: number;
  isTrending: boolean;
  isNew: boolean;
}

const MEME_TOKENS: MemeToken[] = [
  { symbol: "PEPE", name: "Pepe", price: 0.00001234, change24h: 42.5, volume: "$1.2B", marketCap: "$5.2B", rank: 1, isTrending: true, isNew: false },
  { symbol: "DOGE", name: "Dogecoin", price: 0.1534, change24h: 8.3, volume: "$890M", marketCap: "$21.5B", rank: 2, isTrending: true, isNew: false },
  { symbol: "SHIB", name: "Shiba Inu", price: 0.00002456, change24h: -3.2, volume: "$450M", marketCap: "$14.5B", rank: 3, isTrending: false, isNew: false },
  { symbol: "FLOKI", name: "Floki Inu", price: 0.000234, change24h: 18.7, volume: "$320M", marketCap: "$2.2B", rank: 4, isTrending: true, isNew: false },
  { symbol: "BONK", name: "Bonk", price: 0.00003412, change24h: 55.2, volume: "$780M", marketCap: "$2.1B", rank: 5, isTrending: true, isNew: false },
  { symbol: "WIF", name: "dogwifhat", price: 2.45, change24h: 32.1, volume: "$650M", marketCap: "$2.4B", rank: 6, isTrending: true, isNew: false },
  { symbol: "MEME", name: "Memecoin", price: 0.0234, change24h: -12.4, volume: "$120M", marketCap: "$890M", rank: 7, isTrending: false, isNew: false },
  { symbol: "TURBO", name: "Turbo", price: 0.0089, change24h: 67.8, volume: "$95M", marketCap: "$560M", rank: 8, isTrending: true, isNew: true },
  { symbol: "BRETT", name: "Brett", price: 0.156, change24h: 28.9, volume: "$180M", marketCap: "$1.5B", rank: 9, isTrending: true, isNew: true },
  { symbol: "MOG", name: "Mog Coin", price: 0.0000023, change24h: 89.5, volume: "$45M", marketCap: "$320M", rank: 10, isTrending: true, isNew: true },
];

type TabType = "trending" | "gainers" | "new";

const MemeRush = () => {
  const [tab, setTab] = useState<TabType>("trending");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Simulate real-time price tickers
  useEffect(() => {
    const initial: Record<string, number> = {};
    MEME_TOKENS.forEach(t => { initial[t.symbol] = t.price; });
    setPrices(initial);

    const interval = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        MEME_TOKENS.forEach(t => {
          const delta = (Math.random() - 0.48) * 0.02;
          next[t.symbol] = Math.max(0.0000001, (prev[t.symbol] || t.price) * (1 + delta));
        });
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const toggleWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  const formatPrice = (p: number) => {
    if (p < 0.0001) return `$${p.toFixed(10).replace(/0+$/, "")}`;
    if (p < 1) return `$${p.toFixed(6)}`;
    return `$${p.toFixed(2)}`;
  };

  const sortedTokens = [...MEME_TOKENS].sort((a, b) => {
    if (tab === "gainers") return b.change24h - a.change24h;
    if (tab === "new") return a.isNew === b.isNew ? b.change24h - a.change24h : a.isNew ? -1 : 1;
    return a.rank - b.rank;
  });

  const filtered = tab === "new" ? sortedTokens.filter(t => t.isNew || t.isTrending) : sortedTokens;

  const topGainers = [...MEME_TOKENS].sort((a, b) => b.change24h - a.change24h).slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              <Flame size={22} className="text-orange-500" /> Meme Rush
            </h1>
            <p className="text-xs text-muted-foreground">Trending meme tokens & top gainers</p>
          </div>
        </div>

        {/* Leaderboard - Top 3 Gainers */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-yellow-500" />
            <span className="text-sm font-bold text-foreground">Top Gainers Leaderboard</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {topGainers.map((token, i) => (
              <motion.div
                key={token.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-3 text-center ${
                  i === 0
                    ? "bg-gradient-to-br from-yellow-500/20 to-amber-500/10 ring-1 ring-yellow-500/30"
                    : i === 1
                    ? "bg-gradient-to-br from-gray-300/20 to-gray-400/10 ring-1 ring-gray-400/30"
                    : "bg-gradient-to-br from-orange-600/20 to-orange-700/10 ring-1 ring-orange-600/30"
                }`}
              >
                <div className="text-lg font-bold mb-1">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                </div>
                <CoinIcon symbol={token.symbol} size={28} />
                <p className="text-xs font-bold text-foreground mt-1">{token.symbol}</p>
                <p className="text-xs font-bold text-green-400">+{token.change24h.toFixed(1)}%</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: "trending" as TabType, label: "Trending", icon: <Zap size={14} /> },
            { key: "gainers" as TabType, label: "Top Gainers", icon: <TrendingUp size={14} /> },
            { key: "new" as TabType, label: "New & Hot", icon: <Clock size={14} /> },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === t.key
                  ? "gradient-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Token List */}
        <div className="space-y-2">
          {filtered.map((token, i) => {
            const livePrice = prices[token.symbol] || token.price;
            const priceDiff = ((livePrice - token.price) / token.price) * 100;
            const totalChange = token.change24h + priceDiff;

            return (
              <motion.div
                key={token.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 bg-card rounded-xl hover:ring-1 hover:ring-primary/20 transition-all"
              >
                <div className="relative">
                  <span className="absolute -top-1 -left-1 text-[10px] font-bold text-muted-foreground bg-secondary rounded-full w-5 h-5 flex items-center justify-center">
                    {tab === "gainers" ? i + 1 : token.rank}
                  </span>
                  <CoinIcon symbol={token.symbol} size={36} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">{token.symbol}</span>
                    {token.isTrending && <Flame size={12} className="text-orange-500" />}
                    {token.isNew && (
                      <span className="text-[9px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">NEW</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{token.name}</p>
                  <p className="text-[10px] text-muted-foreground">Vol: {token.volume} · MCap: {token.marketCap}</p>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="text-sm font-mono font-bold text-foreground">
                      {formatPrice(livePrice)}
                    </p>
                    <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${
                      totalChange >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {totalChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {totalChange >= 0 ? "+" : ""}{totalChange.toFixed(1)}%
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleWatchlist(token.symbol); }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      watchlist.includes(token.symbol) ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Star size={16} fill={watchlist.includes(token.symbol) ? "currentColor" : "none"} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default MemeRush;
