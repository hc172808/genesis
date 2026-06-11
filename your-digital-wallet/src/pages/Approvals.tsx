import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, AlertTriangle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";

const MOCK_APPROVALS = [
  { protocol: "Uniswap V3", token: "USDC", amount: "Unlimited", risk: "medium" as const, date: "2d ago" },
  { protocol: "Aave V3", token: "ETH", amount: "10.0", risk: "low" as const, date: "5d ago" },
  { protocol: "Unknown DEX", token: "USDT", amount: "Unlimited", risk: "high" as const, date: "1w ago" },
  { protocol: "1inch", token: "DAI", amount: "5,000", risk: "low" as const, date: "2w ago" },
];

const RISK_COLORS = { low: "text-green-400", medium: "text-yellow-400", high: "text-red-400" };
const RISK_BG = { low: "bg-green-500/10", medium: "bg-yellow-500/10", high: "bg-red-500/10" };

const Approvals = () => {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);

  const revoke = (index: number) => {
    setApprovals(approvals.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Approvals</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-4 mb-4 flex items-center gap-3">
          <Shield size={20} className="text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">{approvals.length} Active Approvals</p>
            <p className="text-xs text-muted-foreground">Review and revoke token allowances</p>
          </div>
        </motion.div>

        <div className="space-y-2">
          {approvals.map((a, i) => (
            <motion.div
              key={`${a.protocol}-${a.token}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{a.protocol}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${RISK_BG[a.risk]} ${RISK_COLORS[a.risk]}`}>
                    {a.risk}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{a.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {a.token}: <span className={a.amount === "Unlimited" ? "text-red-400 font-semibold" : "text-foreground"}>{a.amount}</span>
                  </p>
                </div>
                <button
                  onClick={() => revoke(i)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={12} /> Revoke
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {approvals.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Shield size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No active approvals</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Approvals;
