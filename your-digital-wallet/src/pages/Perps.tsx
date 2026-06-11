import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import CoinIcon from "@/components/wallet/CoinIcon";

const PAIRS = [
  { symbol: "BTC", name: "BTC/USDT", price: 67500, change: 2.4, funding: 0.01 },
  { symbol: "ETH", name: "ETH/USDT", price: 3450, change: 1.8, funding: 0.008 },
  { symbol: "SOL", name: "SOL/USDT", price: 178, change: 5.2, funding: 0.015 },
  { symbol: "AVAX", name: "AVAX/USDT", price: 42, change: -1.3, funding: 0.005 },
  { symbol: "MATIC", name: "MATIC/USDT", price: 0.92, change: 3.1, funding: 0.012 },
];

const LEVERAGES = [2, 5, 10, 20, 50];

const Perps = () => {
  const navigate = useNavigate();
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(10);
  const [selectedPair, setSelectedPair] = useState(PAIRS[0]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Perpetuals</h1>
        </div>

        {/* Pair selection */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4 -mx-4 px-4">
          {PAIRS.map((p) => (
            <button
              key={p.symbol}
              onClick={() => setSelectedPair(p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl shrink-0 transition-all ${
                selectedPair.symbol === p.symbol ? "bg-primary/15 ring-1 ring-primary" : "bg-card"
              }`}
            >
              <CoinIcon symbol={p.symbol} size={20} />
              <span className="text-xs font-semibold text-foreground">{p.name}</span>
            </button>
          ))}
        </div>

        {/* Price card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CoinIcon symbol={selectedPair.symbol} size={36} />
                <span className="font-bold text-foreground">{selectedPair.name}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">${selectedPair.price.toLocaleString()}</p>
            </div>
            <div className={`text-right ${selectedPair.change >= 0 ? "text-green-400" : "text-red-400"}`}>
              <div className="flex items-center gap-1">
                {selectedPair.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-semibold">{selectedPair.change > 0 ? "+" : ""}{selectedPair.change}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Funding: {selectedPair.funding}%</p>
            </div>
          </div>
        </motion.div>

        {/* Long / Short */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSide("long")}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              side === "long" ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/50" : "bg-card text-muted-foreground"
            }`}
          >
            Long 📈
          </button>
          <button
            onClick={() => setSide("short")}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              side === "short" ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50" : "bg-card text-muted-foreground"
            }`}
          >
            Short 📉
          </button>
        </div>

        {/* Leverage */}
        <div className="bg-card rounded-2xl p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3">Leverage</p>
          <div className="flex gap-2">
            {LEVERAGES.map((l) => (
              <button
                key={l}
                onClick={() => setLeverage(l)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  leverage === l ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {l}x
              </button>
            ))}
          </div>
        </div>

        {/* Trade input */}
        <div className="bg-card rounded-2xl p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-2">Amount (USDT)</p>
          <input
            type="number"
            placeholder="0.00"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-lg font-semibold outline-none placeholder:text-muted-foreground/30"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Position size: $0.00</span>
            <span>Liq. price: -</span>
          </div>
        </div>

        <button className={`w-full py-4 rounded-2xl font-semibold text-lg text-white transition-all ${
          side === "long" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
        }`}>
          {side === "long" ? "Open Long" : "Open Short"} {leverage}x
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Perps;
