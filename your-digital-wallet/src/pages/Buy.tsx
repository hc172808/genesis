import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Building2, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import CoinIcon from "@/components/wallet/CoinIcon";

const POPULAR_BUY = [
  { symbol: "BTC", name: "Bitcoin", price: "$67,500" },
  { symbol: "ETH", name: "Ethereum", price: "$3,450" },
  { symbol: "SOL", name: "Solana", price: "$178" },
  { symbol: "GYDS", name: "GYDS", price: "$0.15" },
  { symbol: "USDT", name: "Tether", price: "$1.00" },
  { symbol: "USDC", name: "USD Coin", price: "$1.00" },
];

const METHODS = [
  { label: "Card", icon: CreditCard, desc: "Visa, Mastercard" },
  { label: "Bank", icon: Building2, desc: "Wire transfer" },
  { label: "Apple Pay", icon: Smartphone, desc: "Mobile pay" },
];

const Buy = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState("BTC");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Buy Crypto</h1>
        </div>

        {/* Amount */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 mb-4">
          <p className="text-sm text-muted-foreground mb-2">You pay</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-foreground">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/30"
            />
            <span className="text-sm text-muted-foreground">USD</span>
          </div>
          <div className="flex gap-2 mt-3">
            {[50, 100, 250, 500].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v.toString())}
                className="px-3 py-1.5 bg-secondary rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                ${v}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Select coin */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3">You receive</p>
          <div className="grid grid-cols-3 gap-2">
            {POPULAR_BUY.map((coin) => (
              <button
                key={coin.symbol}
                onClick={() => setSelected(coin.symbol)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                  selected === coin.symbol ? "bg-primary/15 ring-1 ring-primary" : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                <CoinIcon symbol={coin.symbol} size={28} />
                <span className="text-xs font-semibold text-foreground">{coin.symbol}</span>
                <span className="text-[10px] text-muted-foreground">{coin.price}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Payment method */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-3">Payment method</p>
          <div className="space-y-2">
            {METHODS.map((m) => (
              <button key={m.label} className="w-full flex items-center gap-3 p-3 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors">
                <m.icon size={20} className="text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        <button
          disabled={!amount}
          className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-semibold text-lg disabled:opacity-40 transition-opacity"
        >
          Buy {selected}
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Buy;
