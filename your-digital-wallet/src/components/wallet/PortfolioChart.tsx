import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getBalanceHistory, saveBalanceSnapshot, getWalletAddress, type BalanceSnapshot } from "@/lib/wallet-core";
import { fetchNativeBalance, fetchAllTokenBalances } from "@/lib/balance-fetcher";
import { getCustomTokens } from "@/lib/custom-tokens";
import { fetchPrices } from "@/lib/price-fetcher";

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;

const filterByTimeframe = (history: BalanceSnapshot[], tf: string): { label: string; value: number }[] => {
  const now = Date.now();
  const ranges: Record<string, number> = {
    "1D": 86400000,
    "1W": 604800000,
    "1M": 2592000000,
    "3M": 7776000000,
    "1Y": 31536000000,
    "ALL": Infinity,
  };

  const cutoff = ranges[tf] === Infinity ? 0 : now - ranges[tf];
  const filtered = history.filter((s) => s.timestamp >= cutoff);

  if (filtered.length === 0) {
    return [{ label: "Now", value: 0 }];
  }

  return filtered.map((s) => {
    const d = new Date(s.timestamp);
    let label: string;
    if (tf === "1D") {
      label = d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
    } else if (tf === "1W" || tf === "1M") {
      label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    } else {
      label = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
    }
    return { label, value: parseFloat(s.usd.toFixed(2)) };
  });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

const PortfolioChart = () => {
  const [timeframe, setTimeframe] = useState<string>("1M");
  const [history, setHistory] = useState<BalanceSnapshot[]>([]);

  // Fetch current balance immediately and save snapshot
  useEffect(() => {
    const wallet = getWalletAddress();
    if (!wallet) return;

    const captureBalance = async () => {
      try {
        const customTokens = getCustomTokens();
        const tokenBals = customTokens.length > 0
          ? await fetchAllTokenBalances(customTokens, wallet)
          : {};
        const symbols = customTokens.map((t) => t.symbol);
        const prices = await fetchPrices(symbols);

        let total = 0;
        for (const t of customTokens) {
          const bal = parseFloat((tokenBals[t.symbol] || "0").replace(/,/g, "")) || 0;
          const price = prices[t.symbol.toUpperCase()]?.usd || 0;
          total += bal * price;
        }

        saveBalanceSnapshot(total);
        setHistory(getBalanceHistory());
      } catch {
        setHistory(getBalanceHistory());
      }
    };

    captureBalance();
    const interval = setInterval(captureBalance, 300000); // every 5 min
    return () => clearInterval(interval);
  }, []);

  // Also refresh displayed history
  useEffect(() => {
    setHistory(getBalanceHistory());
    const interval = setInterval(() => setHistory(getBalanceHistory()), 60000);
    return () => clearInterval(interval);
  }, []);

  const data = filterByTimeframe(history, timeframe);
  const hasData = data.length > 1 || (data.length === 1 && data[0].value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Portfolio</h2>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                timeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-xl p-4 h-48">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160, 84%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(160, 84%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} interval="preserveStartEnd" />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="hsl(160, 84%, 50%)" strokeWidth={2} fill="url(#portfolioGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">No portfolio data yet</p>
            <p className="text-xs mt-1">Balance snapshots are captured every 5 minutes</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PortfolioChart;
