import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Eye,
  BarChart3, MessageCircle, Zap, Fish, Shield, Bell, ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import CoinIcon from "@/components/wallet/CoinIcon";

interface AlphaSignal {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  sentiment: number; // 0-100
  whaleActivity: "high" | "medium" | "low";
  socialMentions: number;
  smartMoney: "accumulating" | "distributing" | "neutral";
  riskLevel: "high" | "medium" | "low";
  signal: "strong_buy" | "buy" | "neutral" | "sell";
  marketCap: string;
  holders: string;
  age: string;
  alerts: string[];
}

const ALPHA_TOKENS: AlphaSignal[] = [
  {
    id: "1", symbol: "TURBO", name: "Turbo", price: 0.0089, change24h: 67.8,
    sentiment: 88, whaleActivity: "high", socialMentions: 12400, smartMoney: "accumulating",
    riskLevel: "high", signal: "strong_buy", marketCap: "$560M", holders: "145K", age: "8 months",
    alerts: ["3 whale wallets bought $2.1M in last 4h", "Twitter mentions up 340%"],
  },
  {
    id: "2", symbol: "MOG", name: "Mog Coin", price: 0.0000023, change24h: 89.5,
    sentiment: 92, whaleActivity: "high", socialMentions: 8900, smartMoney: "accumulating",
    riskLevel: "high", signal: "strong_buy", marketCap: "$320M", holders: "89K", age: "6 months",
    alerts: ["New DEX listing detected", "Volume spike 5x average"],
  },
  {
    id: "3", symbol: "BRETT", name: "Brett", price: 0.156, change24h: 28.9,
    sentiment: 75, whaleActivity: "medium", socialMentions: 5600, smartMoney: "accumulating",
    riskLevel: "medium", signal: "buy", marketCap: "$1.5B", holders: "210K", age: "10 months",
    alerts: ["Smart money wallet added $500K position"],
  },
  {
    id: "4", symbol: "WIF", name: "dogwifhat", price: 2.45, change24h: 32.1,
    sentiment: 81, whaleActivity: "high", socialMentions: 15200, smartMoney: "accumulating",
    riskLevel: "medium", signal: "buy", marketCap: "$2.4B", holders: "320K", age: "1 year",
    alerts: ["Binance futures open interest surging"],
  },
  {
    id: "5", symbol: "PEPE", name: "Pepe", price: 0.00001234, change24h: 42.5,
    sentiment: 79, whaleActivity: "medium", socialMentions: 22100, smartMoney: "neutral",
    riskLevel: "low", signal: "buy", marketCap: "$5.2B", holders: "890K", age: "2 years",
    alerts: ["Consolidation breakout forming on 4h chart"],
  },
  {
    id: "6", symbol: "BONK", name: "Bonk", price: 0.00003412, change24h: 55.2,
    sentiment: 84, whaleActivity: "high", socialMentions: 9800, smartMoney: "accumulating",
    riskLevel: "medium", signal: "strong_buy", marketCap: "$2.1B", holders: "670K", age: "1.5 years",
    alerts: ["Solana ecosystem TVL at ATH", "Major partnership announcement expected"],
  },
  {
    id: "7", symbol: "FLOKI", name: "Floki Inu", price: 0.000234, change24h: 18.7,
    sentiment: 65, whaleActivity: "low", socialMentions: 4200, smartMoney: "neutral",
    riskLevel: "low", signal: "neutral", marketCap: "$2.2B", holders: "450K", age: "3 years",
    alerts: [],
  },
  {
    id: "8", symbol: "MEME", name: "Memecoin", price: 0.0234, change24h: -12.4,
    sentiment: 35, whaleActivity: "medium", socialMentions: 2100, smartMoney: "distributing",
    riskLevel: "high", signal: "sell", marketCap: "$890M", holders: "120K", age: "1 year",
    alerts: ["Top holders reducing positions", "Social sentiment declining"],
  },
];

type TabKey = "signals" | "whales" | "sentiment";

const signalColor = (s: AlphaSignal["signal"]) => {
  switch (s) {
    case "strong_buy": return "text-green-400 bg-green-500/15";
    case "buy": return "text-green-300 bg-green-500/10";
    case "neutral": return "text-muted-foreground bg-secondary";
    case "sell": return "text-red-400 bg-red-500/15";
  }
};
const signalLabel = (s: AlphaSignal["signal"]) =>
  s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());

const sentimentBar = (v: number) => {
  if (v >= 75) return "bg-green-500";
  if (v >= 50) return "bg-yellow-500";
  return "bg-red-500";
};

const riskBadge = (r: AlphaSignal["riskLevel"]) => {
  const map = { high: "text-red-400 bg-red-500/15", medium: "text-yellow-400 bg-yellow-500/15", low: "text-green-400 bg-green-500/15" };
  return map[r];
};

const formatPrice = (p: number) => {
  if (p < 0.0001) return `$${p.toFixed(10).replace(/0+$/, "")}`;
  if (p < 1) return `$${p.toFixed(6)}`;
  return `$${p.toFixed(2)}`;
};

const AlphaToken = () => {
  const [tab, setTab] = useState<TabKey>("signals");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState<string[]>([]);

  const toggleAlert = (id: string) => {
    setAlertsEnabled(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const sorted = [...ALPHA_TOKENS].sort((a, b) => {
    if (tab === "whales") {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.whaleActivity] - order[b.whaleActivity];
    }
    if (tab === "sentiment") return b.sentiment - a.sentiment;
    const sigOrder = { strong_buy: 0, buy: 1, neutral: 2, sell: 3 };
    return sigOrder[a.signal] - sigOrder[b.signal];
  });

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
              <Zap size={22} className="text-yellow-500" /> Alpha Tokens
            </h1>
            <p className="text-xs text-muted-foreground">Early signals, whale tracking & sentiment</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-card rounded-xl p-3 text-center">
            <Zap size={18} className="text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{ALPHA_TOKENS.filter(t => t.signal === "strong_buy").length}</p>
            <p className="text-[10px] text-muted-foreground">Strong Buy</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <Fish size={18} className="text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{ALPHA_TOKENS.filter(t => t.whaleActivity === "high").length}</p>
            <p className="text-[10px] text-muted-foreground">Whale Active</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <AlertTriangle size={18} className="text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{ALPHA_TOKENS.reduce((s, t) => s + t.alerts.length, 0)}</p>
            <p className="text-[10px] text-muted-foreground">Active Alerts</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: "signals" as TabKey, label: "Signals", icon: <BarChart3 size={14} /> },
            { key: "whales" as TabKey, label: "Whale Tracker", icon: <Fish size={14} /> },
            { key: "sentiment" as TabKey, label: "Sentiment", icon: <MessageCircle size={14} /> },
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
          {sorted.map((token, i) => (
            <motion.div
              key={token.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div
                onClick={() => setExpanded(expanded === token.id ? null : token.id)}
                className="flex items-center gap-3 p-3 bg-card rounded-xl hover:ring-1 hover:ring-primary/20 transition-all cursor-pointer"
              >
                <CoinIcon symbol={token.symbol} size={36} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">{token.symbol}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${signalColor(token.signal)}`}>
                      {signalLabel(token.signal)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{token.name}</p>

                  {tab === "sentiment" && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${sentimentBar(token.sentiment)}`} style={{ width: `${token.sentiment}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-foreground">{token.sentiment}%</span>
                    </div>
                  )}

                  {tab === "whales" && (
                    <div className="flex items-center gap-1 mt-1">
                      <Fish size={10} className={token.whaleActivity === "high" ? "text-blue-400" : "text-muted-foreground"} />
                      <span className="text-[10px] text-muted-foreground capitalize">{token.whaleActivity} activity</span>
                      <span className="text-[10px] text-muted-foreground">· {token.smartMoney}</span>
                    </div>
                  )}
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="text-sm font-mono font-bold text-foreground">{formatPrice(token.price)}</p>
                    <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${
                      token.change24h >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {token.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(1)}%
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-muted-foreground transition-transform ${expanded === token.id ? "rotate-90" : ""}`} />
                </div>
              </div>

              {/* Expanded Detail */}
              {expanded === token.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-card/50 rounded-b-xl px-3 pb-3 -mt-1 border-t border-border"
                >
                  <div className="grid grid-cols-2 gap-2 pt-3 mb-3">
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Market Cap</p>
                      <p className="text-xs font-bold text-foreground">{token.marketCap}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Holders</p>
                      <p className="text-xs font-bold text-foreground">{token.holders}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Social Mentions</p>
                      <p className="text-xs font-bold text-foreground">{token.socialMentions.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Risk Level</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskBadge(token.riskLevel)}`}>
                        {token.riskLevel.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div className="mb-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Social Sentiment</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${sentimentBar(token.sentiment)}`} style={{ width: `${token.sentiment}%` }} />
                      </div>
                      <span className="text-xs font-bold text-foreground">{token.sentiment}%</span>
                    </div>
                  </div>

                  {/* Alerts */}
                  {token.alerts.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-muted-foreground mb-1.5">🚨 Active Alerts</p>
                      <div className="space-y-1">
                        {token.alerts.map((alert, ai) => (
                          <div key={ai} className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2">
                            <AlertTriangle size={12} className="text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-foreground/80">{alert}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAlert(token.id); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        alertsEnabled.includes(token.id)
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Bell size={14} />
                      {alertsEnabled.includes(token.id) ? "Alerts On" : "Set Alert"}
                    </button>
                    <Link
                      to={`/token/${token.symbol}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Eye size={14} /> View Token
                    </Link>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default AlphaToken;
