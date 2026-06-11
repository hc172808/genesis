import { motion } from "framer-motion";
import { BarChart3, Users, Coins, Activity } from "lucide-react";
import type { DeployedToken, Transaction } from "@/lib/blockchain/types";

interface AnalyticsPageProps {
  tokens: DeployedToken[];
  transactions: Transaction[];
  isWalletConnected: boolean;
}

const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <div className="glass-card p-5 glow-effect">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <p className="text-3xl font-heading font-bold">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const AnalyticsPage = ({ tokens, transactions, isWalletConnected }: AnalyticsPageProps) => {
  const totalSupply = tokens.reduce((s, t) => s + Number(t.currentSupply), 0);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-heading font-bold mb-2">
            <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-muted-foreground mb-8">Track your tokens and GydsChain activity</p>

          {/* User Stats */}
          {isWalletConnected && (
            <>
              <h2 className="text-xl font-heading font-semibold mb-4">Your Stats</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                <StatCard icon={Coins} label="Tokens Created" value={String(tokens.length)} />
                <StatCard icon={BarChart3} label="Total Supply" value={totalSupply.toLocaleString()} />
                <StatCard icon={Activity} label="Transactions" value={String(transactions.length)} />
                <StatCard icon={Users} label="Network" value="Devnet" sub="GydsChain" />
              </div>
            </>
          )}

          {/* Global Stats */}
          <h2 className="text-xl font-heading font-semibold mb-4">Global Stats</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <StatCard icon={Coins} label="Total Tokens" value="2,400+" />
            <StatCard icon={Users} label="Total Holders" value="12,000+" />
            <StatCard icon={Activity} label="24h Transactions" value="8,543" />
            <StatCard icon={BarChart3} label="Active Tokens" value="1,892" />
          </div>

          {/* Recent Activity */}
          <h2 className="text-xl font-heading font-semibold mb-4">Recent Activity</h2>
          <div className="glass-card p-6">
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.hash} className="flex items-center justify-between bg-muted/20 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${tx.type === "create" ? "bg-primary/20 text-primary" : tx.type === "mint" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                        {tx.type}
                      </span>
                      <span className="font-mono text-sm text-primary">{tx.tokenSymbol}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No recent activity</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
