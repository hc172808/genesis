import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Timer, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";

const MARKETS = [
  { question: "Will BTC reach $100K by end of 2026?", yesOdds: 72, volume: "$4.2M", endDate: "Dec 31", category: "Crypto" },
  { question: "Will ETH flip BTC market cap?", yesOdds: 8, volume: "$1.8M", endDate: "Dec 31", category: "Crypto" },
  { question: "Will SOL reach $500?", yesOdds: 35, volume: "$920K", endDate: "Jun 30", category: "Crypto" },
  { question: "Will GYDS reach $1?", yesOdds: 45, volume: "$320K", endDate: "Dec 31", category: "GYDS" },
  { question: "Fed rate cut in next meeting?", yesOdds: 62, volume: "$8.5M", endDate: "Jul 30", category: "Finance" },
  { question: "AI token sector 2x by Q4?", yesOdds: 58, volume: "$1.2M", endDate: "Dec 31", category: "AI" },
];

const Prediction = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Predictions</h1>
        </div>

        <div className="space-y-3">
          {MARKETS.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card rounded-2xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-semibold text-foreground leading-tight flex-1 pr-3">{m.question}</p>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">{m.category}</span>
              </div>

              {/* Odds bar */}
              <div className="relative h-8 bg-secondary rounded-xl overflow-hidden mb-3">
                <div
                  className="absolute inset-y-0 left-0 bg-green-500/20 flex items-center pl-3"
                  style={{ width: `${m.yesOdds}%` }}
                >
                  <span className="text-xs font-bold text-green-400">Yes {m.yesOdds}%</span>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-xs font-bold text-red-400">No {100 - m.yesOdds}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1"><Users size={10} /> {m.volume}</div>
                <div className="flex items-center gap-1"><Timer size={10} /> Ends {m.endDate}</div>
              </div>

              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 rounded-xl bg-green-500/15 text-green-400 font-semibold text-xs hover:bg-green-500/25 transition-colors">
                  Buy Yes
                </button>
                <button className="flex-1 py-2 rounded-xl bg-red-500/15 text-red-400 font-semibold text-xs hover:bg-red-500/25 transition-colors">
                  Buy No
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Prediction;
