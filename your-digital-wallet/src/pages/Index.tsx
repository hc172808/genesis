import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BalanceCard from "@/components/wallet/BalanceCard";
import PortfolioChart from "@/components/wallet/PortfolioChart";
import AssetsList from "@/components/wallet/AssetsList";
import RecentTransactions from "@/components/wallet/RecentTransactions";
import BottomNav from "@/components/wallet/BottomNav";
import PwaInstallBanner from "@/components/wallet/PwaInstallBanner";
import PwaStatusBanner from "@/components/wallet/PwaStatusBanner";
import AccountSwitcher from "@/components/wallet/AccountSwitcher";
import ChainSelector from "@/components/wallet/ChainSelector";
import TokenDiscovery from "@/components/wallet/TokenDiscovery";
import PopularTokens from "@/components/wallet/PopularTokens";
import { Bell, Settings, ShoppingCart, BarChart3, Layers, Shield, UserPlus, Wallet, Flame, Image, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { initializeAccounts } from "@/lib/multi-account";
import { getWalletAddress } from "@/lib/wallet-core";
import { recordActivity } from "@/lib/session-lock";

const QUICK_ACTIONS = [
  { icon: ShoppingCart, label: "Buy", path: "/buy", color: "from-green-400 to-emerald-500" },
  { icon: Flame, label: "Meme Rush", path: "/meme-rush", color: "from-orange-400 to-red-500" },
  { icon: Zap, label: "Alpha", path: "/alpha", color: "from-yellow-400 to-amber-500" },
  { icon: Image, label: "NFTs", path: "/nfts", color: "from-fuchsia-400 to-pink-500" },
  { icon: BarChart3, label: "Perps", path: "/perps", color: "from-blue-400 to-indigo-500" },
  { icon: Layers, label: "Earn", path: "/earn", color: "from-purple-400 to-violet-500" },
  { icon: Shield, label: "Approvals", path: "/approvals", color: "from-amber-400 to-orange-500" },
  { icon: UserPlus, label: "Following", path: "/following", color: "from-pink-400 to-rose-500" },
  { icon: Wallet, label: "Hardware", path: "/hardware-wallet", color: "from-cyan-400 to-teal-500" },
];

const Index = () => {
  const [chainKey, setChainKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const addr = getWalletAddress();
    if (addr) initializeAccounts(addr);
    recordActivity();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ChainSelector onChainChange={() => setChainKey((k) => k + 1)} />
          </div>
          <div className="flex items-center gap-2">
            <AccountSwitcher />
            <Link to="/alerts" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full gradient-primary" />
            </Link>
            <Link to="/settings" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Settings size={20} />
            </Link>
          </div>
        </div>

        <PwaStatusBanner />
        <div className="mb-8" key={`bal-${chainKey}`}><BalanceCard /></div>

        {/* Quick Actions */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 mb-6">
          {QUICK_ACTIONS.map((a, i) => (
            <motion.button
              key={a.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center`}>
                <a.icon size={20} className="text-white" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
            </motion.button>
          ))}
        </div>

        <div className="mb-8"><PortfolioChart /></div>
        <TokenDiscovery onTokensChanged={() => setChainKey((k) => k + 1)} />
        <div className="mb-8" key={`assets-${chainKey}`}><AssetsList /></div>
        
        {/* Popular Tokens / Explore */}
        <PopularTokens />
        
        <div className="mb-8"><RecentTransactions /></div>
      </div>

      <PwaInstallBanner />
      <BottomNav />
    </div>
  );
};

export default Index;
