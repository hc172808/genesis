import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Plus, Check, Loader2, X } from "lucide-react";
import CoinIcon from "@/components/wallet/CoinIcon";
import { discoverTokens, importDiscoveredToken, getLastDiscoveryTime, setLastDiscoveryTime, type DiscoveredToken } from "@/lib/token-discovery";
import { getWalletAddress } from "@/lib/wallet-core";
import { isAutoDetectTokensEnabled } from "@/lib/auto-detect-settings";

interface TokenDiscoveryProps {
  onTokensChanged?: () => void;
}

const TokenDiscovery = ({ onTokensChanged }: TokenDiscoveryProps) => {
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredToken[]>([]);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [autoScanned, setAutoScanned] = useState(false);

  useEffect(() => {
    if (!isAutoDetectTokensEnabled()) return;
    const lastScan = getLastDiscoveryTime();
    const hourAgo = Date.now() - 3600000;
    if (lastScan < hourAgo && !autoScanned) {
      setAutoScanned(true);
      handleScan();
    }
  }, [autoScanned]);

  const handleScan = async () => {
    const address = getWalletAddress();
    if (!address) return;
    setScanning(true);
    try {
      const tokens = await discoverTokens(address);
      setDiscovered(tokens);
      setLastDiscoveryTime();
    } catch {
      // silent
    }
    setScanning(false);
  };

  const handleImport = (token: DiscoveredToken) => {
    importDiscoveredToken(token, token.chainId);
    setImported((prev) => new Set([...prev, token.contractAddress]));
    onTokensChanged?.();
  };

  if (dismissed || (!scanning && discovered.length === 0)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="mb-4 overflow-hidden"
      >
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">
                {scanning ? "Scanning for tokens…" : `${discovered.length} token${discovered.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!scanning && (
                <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {scanning && (
            <div className="flex items-center gap-2 py-2 text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Checking balances on-chain…</span>
            </div>
          )}

          <div className="space-y-2">
            {discovered.map((token) => {
              const isImported = imported.has(token.contractAddress);
              return (
                <div key={token.contractAddress} className="flex items-center gap-3 py-2">
                  <CoinIcon symbol={token.symbol} size={32} fallbackColor={token.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{token.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate">{token.name} · {token.balance}</p>
                  </div>
                  <button
                    onClick={() => handleImport(token)}
                    disabled={isImported}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isImported
                        ? "bg-secondary text-muted-foreground"
                        : "gradient-primary text-primary-foreground hover:opacity-90 active:scale-95"
                    }`}
                  >
                    {isImported ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TokenDiscovery;
