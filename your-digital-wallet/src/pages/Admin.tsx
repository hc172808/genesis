import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Save, Server, Globe, Users, UserPlus, AlertTriangle, Power, RotateCcw, Check, X, Bug, Crown, Lock, Radar, ShieldCheck, Activity, Wifi, WifiOff, Loader2 } from "lucide-react";
import RpcDebugPanel from "@/components/wallet/RpcDebugPanel";
import HostingChecklist from "@/components/wallet/HostingChecklist";
import {
  isAutoDetectTokensEnabled,
  setAutoDetectTokensEnabled,
  isAutoDetectCustomTokensEnabled,
  setAutoDetectCustomTokensEnabled,
} from "@/lib/auto-detect-settings";
import { Link, Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  getNetworkConfig,
  saveNetworkConfig,
  validateRpcUrl,
  APP_VERSION,
  type NetworkConfig,
} from "@/lib/network-config";
import { getWalletAddress } from "@/lib/wallet-core";
import { isAdminWallet, getAdminWallets, addAdminWallet, removeAdminWallet, isEnvAdmin, isSuperAdmin, SUPER_ADMIN_WALLET } from "@/lib/admin-auth";
import {
  SUPPORTED_CHAINS,
  setChainRpcUrls,
  resetChainRpcUrls,
  setChainForceDisabled,
  isChainForceDisabled,
  getChainById,
  isRpcUrlDisabled,
  setRpcUrlDisabled,
  type ChainConfig,
} from "@/lib/chain-adapter";

const Admin = () => {
  const { toast } = useToast();
  const walletAddress = getWalletAddress();
  const isAdmin = isAdminWallet(walletAddress);
  const superAdmin = isSuperAdmin(walletAddress);

  const [config, setConfig] = useState<NetworkConfig>(getNetworkConfig());
  const [newRpc, setNewRpc] = useState("");
  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"network" | "chains" | "admins" | "detection" | "hosting" | "debug">("network");
  const [autoTokens, setAutoTokens] = useState(isAutoDetectTokensEnabled());
  const [autoCustom, setAutoCustom] = useState(isAutoDetectCustomTokensEnabled());
  const [adminWallets, setAdminWallets] = useState<string[]>([]);
  const [chainStates, setChainStates] = useState<Record<string, { rpcs: string[]; disabled: boolean; newRpc: string; validating?: string; results?: Record<string, { ok: boolean; latencyMs?: number; error?: string } | "pending"> }>>({});
  const [rpcPing, setRpcPing] = useState<Record<string, Record<string, { ok: boolean; ms: number } | "pending">>>({});
  const [testingAll, setTestingAll] = useState<string | null>(null);

  useEffect(() => {
    setAdminWallets(getAdminWallets());
    const states: typeof chainStates = {};
    SUPPORTED_CHAINS.forEach((c) => {
      const cfg = getChainById(c.id);
      states[c.id] = {
        rpcs: cfg?.rpcUrls || c.rpcUrls,
        disabled: isChainForceDisabled(c.id),
        newRpc: "",
      };
    });
    setChainStates(states);
  }, []);

  // Block non-admin users
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleAddRpc = () => {
    const trimmed = newRpc.trim();
    if (!trimmed) return;
    if (!validateRpcUrl(trimmed)) {
      toast({ title: "Invalid URL format", variant: "destructive" });
      return;
    }
    if (config.rpcUrls.includes(trimmed)) {
      toast({ title: "RPC already exists", variant: "destructive" });
      return;
    }
    setConfig({ ...config, rpcUrls: [...config.rpcUrls, trimmed] });
    setNewRpc("");
  };

  const handleRemoveRpc = (index: number) => {
    if (config.rpcUrls.length <= 1) {
      toast({ title: "Must keep at least one RPC", variant: "destructive" });
      return;
    }
    setConfig({ ...config, rpcUrls: config.rpcUrls.filter((_, i) => i !== index) });
  };

  const handleSave = () => {
    saveNetworkConfig(config);
    toast({ title: "Network config saved", description: "Changes will take effect on next connection." });
  };

  const handleAddAdmin = () => {
    const addr = newAdminAddress.trim();
    if (!addr) return;
    const result = addAdminWallet(addr, walletAddress);
    if (result === "ok") {
      setAdminWallets(getAdminWallets());
      setNewAdminAddress("");
      toast({ title: "Admin added", description: `${addr.slice(0, 6)}...${addr.slice(-4)}` });
    } else if (result === "forbidden") {
      toast({ title: "Only the super admin can add admins", variant: "destructive" });
    } else if (result === "exists") {
      toast({ title: "Already an admin", variant: "destructive" });
    } else {
      toast({ title: "Invalid wallet address", description: "Must be a valid 0x... address (42 chars)", variant: "destructive" });
    }
  };

  const handleRemoveAdmin = (addr: string) => {
    const result = removeAdminWallet(addr, walletAddress);
    if (result === "ok") {
      setAdminWallets(getAdminWallets());
      toast({ title: "Admin removed" });
    } else if (result === "forbidden") {
      toast({ title: "Only the super admin can remove admins", variant: "destructive" });
    } else if (result === "protected") {
      toast({ title: "Protected admin", description: "Super admin and env-defined admins cannot be removed", variant: "destructive" });
    }
  };

  // ── Per-chain RPC helpers ─────────────────────────────
  const validateChainRpc = async (chainId: string, url: string): Promise<boolean> => {
    const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
    if (!chain) return false;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      if (chain.type === "evm") {
        const res = await fetch(url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!res.ok) return false;
        const data = await res.json();
        if (!data?.result) return false;
        const cid = parseInt(data.result, 16);
        return chain.chainId ? cid === chain.chainId : true;
      } else {
        const res = await fetch(url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "getHealth", params: [], id: 1 }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        return res.ok;
      }
    } catch { return false; }
  };

  const handleAddChainRpc = async (chainId: string) => {
    const st = chainStates[chainId];
    const url = st.newRpc.trim();
    if (!url || !validateRpcUrl(url)) { toast({ title: "Invalid URL", variant: "destructive" }); return; }
    if (st.rpcs.includes(url)) { toast({ title: "Already added", variant: "destructive" }); return; }
    setChainStates((s) => ({ ...s, [chainId]: { ...s[chainId], validating: url } }));
    const ok = await validateChainRpc(chainId, url);
    if (!ok) {
      setChainStates((s) => ({ ...s, [chainId]: { ...s[chainId], validating: undefined } }));
      toast({ title: "RPC validation failed", description: "Wrong chain ID or unreachable", variant: "destructive" });
      return;
    }
    const nextRpcs = [...st.rpcs, url];
    setChainRpcUrls(chainId, nextRpcs);
    setChainStates((s) => ({ ...s, [chainId]: { ...s[chainId], rpcs: nextRpcs, newRpc: "", validating: undefined } }));
    toast({ title: "RPC added & validated" });
  };

  const handleRemoveChainRpc = (chainId: string, url: string) => {
    const st = chainStates[chainId];
    const next = st.rpcs.filter((u) => u !== url);
    setChainRpcUrls(chainId, next);
    setChainStates((s) => ({ ...s, [chainId]: { ...s[chainId], rpcs: next } }));
  };

  const handleResetChain = (chainId: string) => {
    resetChainRpcUrls(chainId);
    const c = SUPPORTED_CHAINS.find((x) => x.id === chainId)!;
    setChainStates((s) => ({ ...s, [chainId]: { ...s[chainId], rpcs: c.rpcUrls } }));
    toast({ title: "Reset to defaults" });
  };

  const handleTestAllRpcs = async (chainId: string) => {
    const st = chainStates[chainId];
    if (!st || testingAll) return;
    setTestingAll(chainId);

    // Mark all as pending
    const pending: Record<string, "pending"> = {};
    st.rpcs.forEach((u) => (pending[u] = "pending"));
    setRpcPing((p) => ({ ...p, [chainId]: pending }));

    const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
    if (!chain) { setTestingAll(null); return; }

    await Promise.all(
      st.rpcs.map(async (url) => {
        const t0 = performance.now();
        let ok = false;
        try {
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 5000);
          if (chain.type === "evm") {
            const res = await fetch(url, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
              signal: ctrl.signal,
            });
            const d = await res.json();
            ok = !!d?.result;
          } else {
            const res = await fetch(url, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", method: "getHealth", params: [], id: 1 }),
              signal: ctrl.signal,
            });
            ok = res.ok;
          }
          clearTimeout(timeout);
        } catch { ok = false; }
        const ms = Math.round(performance.now() - t0);
        setRpcPing((p) => ({ ...p, [chainId]: { ...p[chainId], [url]: { ok, ms } } }));
      })
    );
    setTestingAll(null);
  };

  const handleToggleChainDisabled = (chainId: string, disabled: boolean) => {
    setChainForceDisabled(chainId, disabled);
    setChainStates((s) => ({ ...s, [chainId]: { ...s[chainId], disabled } }));
    toast({ title: disabled ? "Chain disabled" : "Chain enabled" });
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/settings" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </Link>
          <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
        </div>

        <h1 className="text-xl font-display font-bold text-foreground mb-2">Admin Panel</h1>
        <p className="text-xs text-muted-foreground mb-4">
          Logged in as: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: "network" as const, label: "GYDS", icon: Globe },
            { key: "chains" as const, label: "Chains", icon: Server },
            { key: "admins" as const, label: "Admins", icon: Users },
            { key: "detection" as const, label: "Detection", icon: Radar },
            { key: "hosting" as const, label: "Hosting", icon: ShieldCheck },
            { key: "debug" as const, label: "Debug", icon: Bug },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                activeTab === tab.key ? "gradient-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {superAdmin && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground">
            <Crown size={14} className="text-primary" />
            <span className="font-semibold">Super Admin</span>
            <span className="text-muted-foreground">— full control over the admin list</span>
          </div>
        )}

        {activeTab === "network" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-card rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe size={16} className="text-primary" /> Network Details
              </h2>
              {[
                { label: "Network Name", key: "name" as const },
                { label: "Symbol", key: "symbol" as const },
                { label: "Chain ID", key: "chainId" as const },
                { label: "Chain ID (Hex)", key: "chainIdHex" as const },
                { label: "Decimals", key: "decimals" as const },
                { label: "Block Explorer", key: "blockExplorer" as const },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{field.label}</label>
                  <input value={String(config[field.key])}
                    onChange={(e) => {
                      const val = field.key === "chainId" || field.key === "decimals" ? parseInt(e.target.value) || 0 : e.target.value;
                      setConfig({ ...config, [field.key]: val });
                    }}
                    className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ))}
            </div>

            <div className="bg-card rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Server size={16} className="text-primary" /> RPC Endpoints
              </h2>
              <p className="text-xs text-muted-foreground">Backup failover order — reads the indexer, next available is used if one goes down.</p>

              {config.rpcUrls.map((url, i) => (
                <motion.div key={`${url}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground truncate">{url}</div>
                  <button onClick={() => handleRemoveRpc(i)}
                    className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}

              <div className="flex gap-2">
                <input value={newRpc} onChange={(e) => setNewRpc(e.target.value)} placeholder="https://new-rpc-url.com"
                  onKeyDown={(e) => e.key === "Enter" && handleAddRpc()}
                  className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
                <button onClick={handleAddRpc} className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <button onClick={handleSave}
              className="w-full gradient-primary text-primary-foreground font-display font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-opacity glow-primary flex items-center justify-center gap-2">
              <Save size={20} /> Save Configuration
            </button>
          </motion.div>
        )}

        {activeTab === "chains" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-muted-foreground flex-1">
                Configure RPC endpoints for each supported network. New RPCs are validated against the chain ID before being saved. Disable a chain to hide it across the wallet.
              </p>
              <button
                onClick={() => {
                  SUPPORTED_CHAINS.forEach((c) => {
                    if (chainStates[c.id]) handleTestAllRpcs(c.id);
                  });
                }}
                disabled={!!testingAll}
                data-testid="button-test-all-rpcs"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/60 transition-colors disabled:opacity-50"
              >
                {testingAll ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                Test All
              </button>
            </div>
            {SUPPORTED_CHAINS.map((c) => {
              const st = chainStates[c.id];
              if (!st) return null;
              return (
                <div key={c.id} className="bg-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                      <p className="text-xs text-muted-foreground">{c.symbol} · {c.type === "evm" ? `Chain ${c.chainId}` : "Solana"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetChain(c.id)}
                        className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                        title="Reset to defaults"
                      ><RotateCcw size={14} /></button>
                      <button
                        onClick={() => handleToggleChainDisabled(c.id, !st.disabled)}
                        className={`px-3 h-8 rounded-lg flex items-center gap-1.5 text-xs font-semibold ${
                          st.disabled ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                        }`}
                      >
                        <Power size={12} /> {st.disabled ? "Disabled" : "Enabled"}
                      </button>
                    </div>
                  </div>

                  {st.rpcs.map((url) => {
                    const urlDisabled = isRpcUrlDisabled(url);
                    const ping = rpcPing[c.id]?.[url];
                    return (
                    <div key={url} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className={`bg-secondary rounded-lg px-3 py-2 text-xs truncate font-mono ${urlDisabled ? "line-through text-muted-foreground" : "text-foreground"}`}>{url}</div>
                        {ping && ping !== "pending" && (
                          <div className={`flex items-center gap-1.5 px-2 text-[10px] font-semibold ${ping.ok ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                            {ping.ok ? <Wifi size={10} /> : <WifiOff size={10} />}
                            {ping.ok ? `${ping.ms} ms` : "Unreachable"}
                          </div>
                        )}
                        {ping === "pending" && (
                          <div className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground">
                            <Loader2 size={10} className="animate-spin" /> Testing…
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => { setRpcUrlDisabled(url, !urlDisabled); setChainStates((s) => ({ ...s })); toast({ title: urlDisabled ? "URL re-enabled" : "URL disabled" }); }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${urlDisabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                        title={urlDisabled ? "Re-enable" : "Disable URL (skip in failover)"}
                      ><Power size={14} /></button>
                      <button
                        onClick={() => handleRemoveChainRpc(c.id, url)}
                        disabled={st.rpcs.length <= 1}
                        className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      ><Trash2 size={14} /></button>
                    </div>
                    );
                  })}

                  <div className="flex gap-2">
                    <input
                      value={st.newRpc}
                      onChange={(e) => setChainStates((s) => ({ ...s, [c.id]: { ...s[c.id], newRpc: e.target.value } }))}
                      placeholder={c.type === "evm" ? "https://rpc.example.com" : "https://api.mainnet.solana"}
                      onKeyDown={(e) => e.key === "Enter" && handleAddChainRpc(c.id)}
                      className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleAddChainRpc(c.id)}
                      disabled={!!st.validating}
                      className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0 disabled:opacity-50"
                    >
                      {st.validating ? <X size={16} className="animate-pulse" /> : <Check size={16} />}
                    </button>
                  </div>
                  {st.validating && (
                    <p className="text-xs text-muted-foreground">Validating {st.validating}…</p>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === "admins" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-card rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users size={16} className="text-primary" /> Admin Wallets
              </h2>
              <p className="text-xs text-muted-foreground">
                Only these wallets can access the admin panel. Only the <span className="text-primary font-semibold">super admin</span> can add or remove other admins.
              </p>

              {adminWallets.map((addr) => {
                const isSuper = addr.toLowerCase() === SUPER_ADMIN_WALLET;
                const protectedAdmin = isSuper || isEnvAdmin(addr);
                return (
                  <div key={addr} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-3">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {isSuper ? <Crown size={14} /> : addr.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-foreground truncate">{addr}</p>
                      <p className="text-xs text-muted-foreground">
                        {isSuper ? "👑 Super admin" : isEnvAdmin(addr) ? "🔒 Env-defined" : "Runtime admin"}
                        {addr.toLowerCase() === walletAddress?.toLowerCase() ? " (you)" : ""}
                      </p>
                    </div>
                    {!protectedAdmin && superAdmin && (
                      <button onClick={() => handleRemoveAdmin(addr)}
                        className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                    {!protectedAdmin && !superAdmin && (
                      <Lock size={14} className="text-muted-foreground" />
                    )}
                  </div>
                );
              })}

              {superAdmin ? (
                <div className="flex gap-2 pt-2">
                  <input value={newAdminAddress} onChange={(e) => setNewAdminAddress(e.target.value)} placeholder="0x... wallet address"
                    onKeyDown={(e) => e.key === "Enter" && handleAddAdmin()}
                    className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={handleAddAdmin} className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
                    <UserPlus size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border mt-2">
                  <Lock size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Adding or removing admins is restricted to the super admin.
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                <AlertTriangle size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Permanent admins can also be set via <code className="text-primary">VITE_ADMIN_WALLETS</code> in .env (comma-separated).
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "detection" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-card rounded-xl p-4 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Radar size={16} className="text-primary" /> Auto-detection
              </h2>

              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-foreground">Auto-detect tokens</p>
                  <p className="text-xs text-muted-foreground">Scan known ERC-20s on Ethereum and Polygon hourly.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoTokens}
                  onChange={(e) => { setAutoTokens(e.target.checked); setAutoDetectTokensEnabled(e.target.checked); }}
                  className="w-5 h-5 accent-primary mt-1"
                />
              </label>

              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-foreground">Auto-refresh custom tokens</p>
                  <p className="text-xs text-muted-foreground">Re-fetch balances for imported tokens on dashboard mount.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoCustom}
                  onChange={(e) => { setAutoCustom(e.target.checked); setAutoDetectCustomTokensEnabled(e.target.checked); }}
                  className="w-5 h-5 accent-primary mt-1"
                />
              </label>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <AlertTriangle size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Settings are stored locally per device.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "hosting" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-card rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" /> Self-hosting checklist
              </h2>
              <p className="text-xs text-muted-foreground">
                Install &amp; harden a server before going live. Full guide at <code className="text-primary">docs/SELF_HOSTING.md</code>.
              </p>

              <HostingChecklist />

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs font-semibold text-foreground mb-1">One-click install + harden</p>
                <pre className="text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
# 1. install dependencies
sudo bash scripts/install.sh

# 2. firewall + fail2ban + nginx + TLS
sudo DOMAIN=wallet.example.com EMAIL=you@example.com \
  bash scripts/harden.sh
                </pre>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "debug" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <RpcDebugPanel />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Admin;
