import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { getWalletAddress } from "@/lib/wallet-core";
import { fetchNativeBalance, fetchAllTokenBalances } from "@/lib/balance-fetcher";
import { getCustomTokens } from "@/lib/custom-tokens";
import { fetchPrices } from "@/lib/price-fetcher";
import { saveBalanceSnapshot } from "@/lib/wallet-core";

const BalanceCard = () => {
  const [visible, setVisible] = useState(true);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const wallet = getWalletAddress();

  useEffect(() => {
    if (!wallet) return;

    const calc = async () => {
      try {
        const customTokens = getCustomTokens();
        const tokenBals = customTokens.length > 0
          ? await fetchAllTokenBalances(customTokens, wallet)
          : {};
        const symbols = customTokens.map((t) => t.symbol);
        const prices = await fetchPrices(symbols);

        let total = 0;
        for (const t of customTokens) {
          const bal = parseFloat((tokenBals[t.symbol] || "0").replace(/,/g, "")) || 0;
          const price = prices[t.symbol.toUpperCase()]?.usd || 0;
          total += bal * price;
        }
        setTotalUsd(total);
        saveBalanceSnapshot(total);
      } catch {
        // silent
      }
    };

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [wallet]);

  const formattedBalance = totalUsd > 0
    ? `$${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "$0.00";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="gradient-primary rounded-2xl p-6 glow-primary relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-foreground/5" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-foreground/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-primary-foreground/70">Total Balance</p>
          <button onClick={() => setVisible(!visible)} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
            {visible ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <h1 className="text-4xl font-display font-bold text-primary-foreground mb-1">
          {visible ? formattedBalance : "••••••"}
        </h1>
        {wallet && (
          <p className="text-xs text-primary-foreground/50 mb-6">
            {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </p>
        )}

        <div className="flex gap-3">
          <ActionButton icon={<ArrowUpRight size={18} />} label="Send" href="/send" />
          <ActionButton icon={<ArrowDownLeft size={18} />} label="Receive" href="/receive" />
        </div>
      </div>
    </motion.div>
  );
};

const ActionButton = ({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) => (
  <a
    href={href}
    className="flex items-center gap-2 bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground backdrop-blur-sm"
  >
    {icon}
    {label}
  </a>
);

export default BalanceCard;
