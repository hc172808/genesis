import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Repeat, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { getTransactionHistory, formatTxTime, type Transaction } from "@/lib/transaction-history";
import CoinIcon from "@/components/wallet/CoinIcon";

const iconMap = {
  sent: <ArrowUpRight size={12} />,
  received: <ArrowDownLeft size={12} />,
  swap: <Repeat size={12} />,
};

const colorMap = {
  sent: "bg-destructive/20 text-destructive",
  received: "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]",
  swap: "bg-primary/20 text-primary",
};

const RecentTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setTransactions(getTransactionHistory().slice(0, 5));
    const interval = setInterval(() => setTransactions(getTransactionHistory().slice(0, 5)), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Recent Activity</h2>
        <Link to="/history" className="text-sm text-muted-foreground hover:text-primary transition-colors">View All</Link>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Inbox size={24} className="text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-card transition-colors cursor-pointer"
            >
              <div className="relative shrink-0">
                <CoinIcon symbol={tx.symbol} size={36} />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${colorMap[tx.type]} border-2 border-background`}>
                  {iconMap[tx.type]}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {tx.type === "sent" ? "Sent" : tx.type === "received" ? "Received" : "Swapped"} {tx.symbol}
                </p>
                <p className="text-xs text-muted-foreground">{formatTxTime(tx.timestamp)}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${tx.type === "received" ? "text-[hsl(var(--success))]" : tx.type === "sent" ? "text-destructive" : "text-foreground"}`}>
                  {tx.type === "sent" ? "-" : tx.type === "received" ? "+" : ""}{tx.amount} {tx.symbol}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;
