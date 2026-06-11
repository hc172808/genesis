import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchPriceHistory, type PriceHistoryPoint } from "@/lib/price-fetcher";
import type { SwapToken } from "@/lib/dex-swap";

type TimeRange = "7D" | "30D" | "1Y";
const RANGES: { label: TimeRange; days: number }[] = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "1Y", days: 365 },
];

interface SwapChartProps {
  fromToken: SwapToken;
  toToken: SwapToken;
}

const ChartTooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
      <p className="text-sm font-semibold text-foreground">{payload[0].value.toFixed(6)}</p>
    </div>
  );
};

const SwapChart = ({ fromToken, toToken }: SwapChartProps) => {
  const [range, setRange] = useState<TimeRange>("7D");
  const [data, setData] = useState<{ date: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const days = RANGES.find((r) => r.label === range)!.days;

      const [fromHistory, toHistory] = await Promise.all([
        fetchPriceHistory(fromToken.symbol, days),
        fetchPriceHistory(toToken.symbol, days),
      ]);

      if (fromHistory.length && toHistory.length) {
        const minLen = Math.min(fromHistory.length, toHistory.length);
        const rates = [];
        for (let i = 0; i < minLen; i++) {
          const fromP = fromHistory[i].price;
          const toP = toHistory[i].price;
          if (toP > 0) {
            rates.push({ date: fromHistory[i].date, rate: fromP / toP });
          }
        }
        setData(rates);
      } else {
        setData([]);
      }
      setLoading(false);
    };
    load();
  }, [fromToken.symbol, toToken.symbol, range]);

  const rateChange = data.length >= 2
    ? ((data[data.length - 1].rate - data[0].rate) / data[0].rate) * 100
    : 0;
  const isUp = rateChange >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {fromToken.symbol}/{toToken.symbol} Rate
          </p>
          {data.length > 0 && (
            <span className={`text-xs font-semibold ${isUp ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
              {isUp ? "+" : ""}{rateChange.toFixed(2)}%
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.label)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                range === r.label
                  ? "gradient-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-32">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No chart data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="swapChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#swapChartGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
};

export default SwapChart;
