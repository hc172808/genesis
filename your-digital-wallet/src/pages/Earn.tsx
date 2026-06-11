import { motion } from "framer-motion";
import { ArrowLeft, Percent, Lock, TrendingUp, Coins, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";

const EARN_OPTIONS = [
  { title: "Staking", desc: "Stake tokens and earn rewards", icon: Lock, apy: "4.5-12%", color: "from-cyan-400 to-teal-500" },
  { title: "Liquidity Pools", desc: "Provide liquidity and earn fees", icon: Coins, apy: "8-25%", color: "from-purple-400 to-indigo-500" },
  { title: "Yield Farming", desc: "Farm tokens across protocols", icon: TrendingUp, apy: "10-40%", color: "from-green-400 to-emerald-500" },
  { title: "Lending", desc: "Lend assets and earn interest", icon: Percent, apy: "3-8%", color: "from-blue-400 to-sky-500" },
  { title: "Rewards", desc: "Earn from daily tasks & referrals", icon: Gift, apy: "Variable", color: "from-amber-400 to-orange-500" },
];

const Earn = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Earn</h1>
        </div>

        {/* Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
          <p className="text-3xl font-bold text-foreground">$0.00</p>
          <p className="text-xs text-green-400 mt-1">Start earning today →</p>
        </motion.div>

        {/* Options */}
        <div className="space-y-3">
          {EARN_OPTIONS.map((opt, i) => (
            <motion.button
              key={opt.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl hover:bg-card/80 transition-colors text-left"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center`}>
                <opt.icon size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{opt.title}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-green-400">{opt.apy}</span>
                <p className="text-[10px] text-muted-foreground">APY</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Earn;
