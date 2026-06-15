import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCustomTokens, getChainLabel, type CustomToken } from "@/lib/custom-tokens";
import { getHiddenTokens } from "@/lib/hidden-tokens";
import { TokenManager } from "@/components/wallet/ImportToken";
import CoinIcon from "@/components/wallet/CoinIcon";
import { fetchNativeBalance, fetchAllTokenBalances } from "@/lib/balance-fetcher";
import { fetchPrices, formatPrice, formatChange, type PriceData } from "@/lib/price-fetcher";
import { getWalletAddress } from "@/lib/wallet-core";
import { isSolanaAddress, fetchAllSolanaBalances } from "@/lib/solana-balance";

const AssetsList = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [nativeBalance, setNativeBalance] = useState<string>("0");
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const customTokens = getCustomTokens();
  const walletAddress = getWalletAddress();
  const isSolana = walletAddress ? isSolanaAddress(walletAddress) : false;

  // Fetch live prices from CoinGecko
  useEffect(() => {
    const symbols = customTokens.map((t) => t.symbol);
    if (isSolana) symbols.push("SOL", ...Object.keys(tokenBalances));
    fetchPrices([...new Set(symbols)]).then(setPrices);
    const interval = setInterval(() => {
      const syms = customTokens.map((t) => t.symbol);
      if (isSolana) syms.push("SOL", ...Object.keys(tokenBalances));
      fetchPrices([...new Set(syms)]).then(setPrices);
    }, 60000);
    return () => clearInterval(interval);
  }, [customTokens.length, isSolana, Object.keys(tokenBalances).length]);

  // Fetch balances
  useEffect(() => {
    if (!walletAddress) return;

    const fetchBalances = async () => {
      setLoadingBalances(true);
      try {
        if (isSolana) {
          const { sol, tokens } = await fetchAllSolanaBalances(walletAddress);
          setNativeBalance(sol);
          setTokenBalances(tokens);
        } else {
          const native = await fetchNativeBalance(walletAddress);
          setNativeBalance(native);
          if (customTokens.length > 0) {
            const balances = await fetchAllTokenBalances(customTokens, walletAddress);
            setTokenBalances(balances);
          }
        }
      } catch {
        // silent
      } finally {
        setLoadingBalances(false);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [walletAddress, refreshKey, customTokens.length, isSolana]);

  const nativeAsset = isSolana
    ? {
        symbol: "SOL",
        name: "Solana",
        price: prices["SOL"] ? formatPrice(prices["SOL"].usd) : "—",
        change: prices["SOL"] ? formatChange(prices["SOL"].usd_24h_change).text : "—",
        up: prices["SOL"] ? formatChange(prices["SOL"].usd_24h_change).up : true,
        amount: nativeBalance,
        value: prices["SOL"] && parseFloat(nativeBalance) > 0
          ? `$${(parseFloat(nativeBalance) * prices["SOL"].usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `${nativeBalance} SOL`,
        color: "from-purple-500 to-fuchsia-500",
      }
    : {
        symbol: "GYDS",
        name: "GYDS Network",
        price: "—",
        change: "—",
        up: true,
        amount: nativeBalance,
        value: `${nativeBalance} GYDS`,
        color: "from-cyan-400 to-teal-500",
      };

  // Build SPL token assets for Solana wallets
  const solanaTokenAssets = isSolana
    ? Object.entries(tokenBalances).map(([sym, bal]) => {
        const priceData = prices[sym.toUpperCase()];
        const balNum = parseFloat(bal) || 0;
        const usdValue = priceData ? balNum * priceData.usd : 0;
        const changeInfo = priceData ? formatChange(priceData.usd_24h_change) : { text: "—", up: true };
        return {
          symbol: sym,
          name: sym,
          price: priceData ? formatPrice(priceData.usd) : "—",
          change: changeInfo.text,
          up: changeInfo.up,
          amount: bal,
          value: usdValue > 0
            ? `$${usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `${bal} ${sym}`,
          color: "from-gray-400 to-slate-500",
        };
      })
    : [];

  const allAssets = [
    nativeAsset,
    ...(isSolana ? [] : [{
      symbol: "GYD",
      name: "GYD Stablecoin",
      price: "—",
      change: "—",
      up: true,
      amount: "0",
      value: "0 GYD",
      color: "from-sky-400 to-cyan-500",
    }]),
    ...solanaTokenAssets,
    ...customTokens.map((t: CustomToken) => {
      const priceData = prices[t.symbol.toUpperCase()];
      const balance = tokenBalances[t.symbol] || "0";
      const balanceNum = parseFloat(balance.replace(/,/g, "")) || 0;
      const usdValue = priceData ? balanceNum * priceData.usd : 0;
      const changeInfo = priceData ? formatChange(priceData.usd_24h_change) : { text: "—", up: true };

      return {
        symbol: t.symbol,
        name: t.name,
        price: priceData ? formatPrice(priceData.usd) : "—",
        change: changeInfo.text,
        up: changeInfo.up,
        amount: balance,
        value: priceData && usdValue > 0
          ? `$${usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `${balance} ${t.symbol}`,
        color: t.color,
        chainLabel: getChainLabel(t.chainId),
      };
    }),
  ];

  // Filter hidden tokens
  const hiddenTokens = getHiddenTokens();
  const visibleAssets = allAssets.filter((a) => !hiddenTokens.includes(a.symbol.toUpperCase()));

  return (
    <div>
      {walletAddress && (
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
          <span className="text-xs text-muted-foreground truncate">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
          {loadingBalances && <Loader2 size={12} className="text-muted-foreground animate-spin" />}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Your Assets</h2>
      </div>
      <div className="space-y-3 mb-6">
        {visibleAssets.map((asset, i) => (
          <motion.div
            key={`${asset.symbol}-${refreshKey}-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            onClick={() => navigate(`/token/${asset.symbol}`)}
            className="flex items-center gap-3 bg-card rounded-xl p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <CoinIcon symbol={asset.symbol} size={40} fallbackColor={asset.color} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="font-semibold text-foreground">{asset.symbol}</p>
                  {("chainLabel" in asset) && (asset as any).chainLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium uppercase tracking-wide shrink-0">
                      {(asset as any).chainLabel}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-foreground text-sm">{asset.value}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{asset.name}</p>
                <div className="flex items-center gap-1">
                  {asset.change !== "—" && (
                    <>
                      {asset.up ? (
                        <TrendingUp size={12} className="text-success" />
                      ) : (
                        <TrendingDown size={12} className="text-destructive" />
                      )}
                      <span className={`text-sm ${asset.up ? "text-success" : "text-destructive"}`}>
                        {asset.change}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <TokenManager
        onTokensChanged={() => setRefreshKey((k) => k + 1)}
        balances={tokenBalances}
      />
    </div>
  );
};

export default AssetsList;
