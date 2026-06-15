import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, Link2, Server, CheckCircle2, XCircle, Loader2, Copy, ExternalLink, Blocks, Fuel, RefreshCw, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import QrConnectScanner from "@/components/wallet/QrConnectScanner";
import { getNetworkConfig, getActiveRpc } from "@/lib/network-config";
import { useToast } from "@/hooks/use-toast";

interface RpcStatus {
  url: string;
  status: "checking" | "online" | "offline";
  latency?: number;
}

const Network = () => {
  const config = getNetworkConfig();
  const [rpcStatuses, setRpcStatuses] = useState<RpcStatus[]>(
    config.rpcUrls.map((url) => ({ url, status: "checking" }))
  );
  const [activeRpc, setActiveRpc] = useState<string | null>(null);
  const [blockHeight, setBlockHeight] = useState<string | null>(null);
  const [gasPrice, setGasPrice] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [addingToMetaMask, setAddingToMetaMask] = useState(false);
  const { toast } = useToast();

  const fetchChainStats = useCallback(async (rpcUrl: string) => {
    setStatsLoading(true);
    try {
      const [blockRes, gasRes] = await Promise.all([
        fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
        }),
        fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 2 }),
        }),
      ]);

      const blockData = await blockRes.json();
      const gasData = await gasRes.json();

      if (blockData.result) {
        setBlockHeight(parseInt(blockData.result, 16).toLocaleString());
      }
      if (gasData.result) {
        const gweiValue = parseInt(gasData.result, 16) / 1e9;
        setGasPrice(gweiValue < 0.01 ? "< 0.01" : gweiValue.toFixed(2));
      }
    } catch {
      setBlockHeight(null);
      setGasPrice(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    config.rpcUrls.forEach(async (url, index) => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const latency = Date.now() - start;
        setRpcStatuses((prev) => {
          const updated = [...prev];
          updated[index] = { url, status: res.ok ? "online" : "offline", latency };
          return updated;
        });
      } catch {
        setRpcStatuses((prev) => {
          const updated = [...prev];
          updated[index] = { url, status: "offline" };
          return updated;
        });
      }
    });

    getActiveRpc().then((rpc) => {
      setActiveRpc(rpc);
      if (rpc) fetchChainStats(rpc);
    });
  }, [fetchChainStats]);

  // Auto-refresh stats every 15s
  useEffect(() => {
    if (!activeRpc) return;
    const interval = setInterval(() => fetchChainStats(activeRpc), 15000);
    return () => clearInterval(interval);
  }, [activeRpc, fetchChainStats]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const addToMetaMask = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      toast({ title: "MetaMask not detected", description: "Install MetaMask to add this network.", variant: "destructive" });
      return;
    }
    setAddingToMetaMask(true);
    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: config.chainIdHex,
          chainName: config.name,
          nativeCurrency: { name: config.name, symbol: config.symbol, decimals: config.decimals },
          rpcUrls: [config.rpcUrls[0]],
          blockExplorerUrls: [config.blockExplorer],
        }],
      });
      toast({ title: "Network added!", description: `${config.name} has been added to MetaMask.` });
    } catch (err: any) {
      if (err.code === 4001) {
        toast({ title: "Cancelled", description: "You rejected the request." });
      } else {
        toast({ title: "Failed to add network", description: err.message, variant: "destructive" });
      }
    } finally {
      setAddingToMetaMask(false);
    }
  };

  const details = [
    { label: "Network Name", value: config.name },
    { label: "Symbol", value: config.symbol },
    { label: "Chain ID", value: String(config.chainId) },
    { label: "Chain ID (Hex)", value: config.chainIdHex },
    { label: "Decimals", value: String(config.decimals) },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Link
          to="/settings"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
              <Globe size={22} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">{config.name}</h1>
              <p className="text-sm text-muted-foreground">Chain details & RPC status</p>
            </div>
          </div>
        </motion.div>

        {/* Live Chain Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          <div className="bg-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Blocks size={16} className="text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Block Height</span>
            </div>
            {statsLoading ? (
              <Loader2 size={18} className="text-muted-foreground animate-spin" />
            ) : blockHeight ? (
              <p className="text-lg font-display font-bold text-foreground">{blockHeight}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Unavailable</p>
            )}
          </div>
          <div className="bg-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Fuel size={16} className="text-accent" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Gas Price</span>
            </div>
            {statsLoading ? (
              <Loader2 size={18} className="text-muted-foreground animate-spin" />
            ) : gasPrice ? (
              <p className="text-lg font-display font-bold text-foreground">{gasPrice} <span className="text-xs text-muted-foreground font-normal">Gwei</span></p>
            ) : (
              <p className="text-sm text-muted-foreground">Unavailable</p>
            )}
          </div>
        </motion.div>

        {/* QR Scan to Connect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="mb-4"
        >
          <QrConnectScanner onConnect={() => window.location.reload()} />
        </motion.div>

        {/* Add to MetaMask */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={addToMetaMask}
          disabled={addingToMetaMask}
          className="w-full flex items-center justify-center gap-3 gradient-primary text-primary-foreground font-display font-bold py-3.5 rounded-2xl mb-4 hover:opacity-90 transition-opacity glow-primary disabled:opacity-60"
        >
          {addingToMetaMask ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Wallet size={20} />
          )}
          Add to MetaMask
        </motion.button>

        {/* Chain Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl divide-y divide-border mb-4"
        >
          {details.map((item) => (
            <button
              key={item.label}
              onClick={() => copyToClipboard(item.value)}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                {item.value}
                <Copy size={12} className="text-muted-foreground" />
              </span>
            </button>
          ))}
        </motion.div>

        {/* Block Explorer */}
        <motion.a
          href={config.blockExplorer}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-4 bg-card rounded-2xl p-4 mb-6 hover:bg-secondary/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <ExternalLink size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Block Explorer</p>
            <p className="text-xs text-muted-foreground truncate">{config.blockExplorer}</p>
          </div>
          <Link2 size={16} className="text-muted-foreground" />
        </motion.a>

        {/* RPC Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              RPC Endpoints
            </h2>
            <button
              onClick={() => {
                if (activeRpc) fetchChainStats(activeRpc);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {rpcStatuses.map((rpc, i) => (
              <motion.div
                key={rpc.url}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className={`flex items-center gap-3 bg-card rounded-xl p-4 ${
                  activeRpc === rpc.url ? "ring-1 ring-primary/50" : ""
                }`}
              >
                <div className="flex-shrink-0">
                  {rpc.status === "checking" ? (
                    <Loader2 size={18} className="text-muted-foreground animate-spin" />
                  ) : rpc.status === "online" ? (
                    <CheckCircle2 size={18} className="text-[hsl(var(--success))]" />
                  ) : (
                    <XCircle size={18} className="text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{rpc.url}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">{rpc.status}</span>
                    {rpc.latency && (
                      <span className="text-xs text-muted-foreground">• {rpc.latency}ms</span>
                    )}
                    {activeRpc === rpc.url && (
                      <span className="text-xs text-primary font-medium">• Active</span>
                    )}
                  </div>
                </div>
                <Server size={14} className="text-muted-foreground flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Network;
