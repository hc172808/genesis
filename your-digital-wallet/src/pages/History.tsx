import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Repeat, Filter, ExternalLink, Inbox } from "lucide-react";
import CoinIcon from "@/components/wallet/CoinIcon";
import BottomNav from "@/components/wallet/BottomNav";
import { getTransactionHistory, formatTxDate, formatTxTime, shortAddress, type Transaction } from "@/lib/transaction-history";
import { getNetworkConfig } from "@/lib/network-config";

type FilterType = "all" | "sent" | "received" | "swap";

const iconMap = {
  sent: <ArrowUpRight size={16} />,
  received: <ArrowDownLeft size={16} />,
  swap: <Repeat size={16} />,
};

const colorMap = {
  sent: "bg-destructive/20 text-destructive",
  received: "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]",
  swap: "bg-primary/20 text-primary",
};

const History = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showFilter, setShowFilter] = useState(false);
  const config = getNetworkConfig();

  useEffect(() => {
    setTransactions(getTransactionHistory());
    // Refresh every 30s
    const interval = setInterval(() => setTransactions(getTransactionHistory()), 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "all" ? transactions : transactions.filter((tx) => tx.type === filter);

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const date = formatTxDate(tx.timestamp);
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {});

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "sent", label: "Sent" },
    { value: "received", label: "Received" },
    { value: "swap", label: "Swaps" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display font-bold text-foreground">Transaction History</h1>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              showFilter ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Filter chips */}
        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="flex gap-2">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      filter === opt.value
                        ? "gradient-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
              <Inbox size={28} className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold mb-1">No transactions yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your sent and received transactions will appear here once you make your first transfer.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, txs]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{date}</p>
                <div className="space-y-2">
                  {txs.map((tx, i) => (
                    <motion.a
                      key={tx.id}
                      href={`${config.blockExplorer}/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="flex items-center gap-3 p-4 bg-card rounded-xl hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="relative shrink-0">
                        <CoinIcon symbol={tx.symbol} size={40} />
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${colorMap[tx.type]} border-2 border-background`}>
                          {iconMap[tx.type]}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground">
                            {tx.type === "sent" ? "Sent" : tx.type === "received" ? "Received" : "Swapped"} {tx.symbol}
                          </p>
                          <ExternalLink size={12} className="text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.type === "sent" ? `To ${shortAddress(tx.toAddress || "")}` : `From ${shortAddress(tx.fromAddress || "")}`}
                          {" · "}
                          {formatTxTime(tx.timestamp)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${
                          tx.type === "received" ? "text-[hsl(var(--success))]" : tx.type === "sent" ? "text-destructive" : "text-foreground"
                        }`}>
                          {tx.type === "sent" ? "-" : tx.type === "received" ? "+" : ""}{tx.amount} {tx.symbol}
                        </p>
                        <p className={`text-[10px] font-medium ${
                          tx.status === "confirmed" ? "text-[hsl(var(--success))]" : tx.status === "pending" ? "text-yellow-500" : "text-destructive"
                        }`}>
                          {tx.status}
                        </p>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default History;
