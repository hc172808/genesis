import { useEffect, useState } from "react";
import { Activity, Database, Trash2, RefreshCw } from "lucide-react";
import {
  getRpcLog,
  clearRpcLog,
  subscribeRpcLog,
  getCacheStorageSizes,
  type RpcLogEntry,
} from "@/lib/rpc-debug-log";

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const RpcDebugPanel = () => {
  const [log, setLog] = useState<RpcLogEntry[]>([]);
  const [caches, setCaches] = useState<Array<{ name: string; entries: number; bytes: number }>>([]);
  const [loadingCaches, setLoadingCaches] = useState(false);

  useEffect(() => {
    setLog(getRpcLog());
    return subscribeRpcLog(() => setLog(getRpcLog()));
  }, []);

  const refreshCaches = async () => {
    setLoadingCaches(true);
    const sizes = await getCacheStorageSizes();
    setCaches(sizes);
    setLoadingCaches(false);
    // eslint-disable-next-line no-console
    console.info("[debug] cache storage sizes", sizes);
  };

  useEffect(() => {
    refreshCaches();
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity size={16} className="text-primary" /> RPC Request Log
          </h2>
          <button
            onClick={() => { clearRpcLog(); }}
            className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Each token-balance fetch records its chain ID and RPC URL. Use this to verify per-chain routing.
        </p>
        <div className="max-h-64 overflow-y-auto space-y-1 text-xs font-mono">
          {log.length === 0 && (
            <p className="text-muted-foreground italic">No RPC calls recorded yet.</p>
          )}
          {[...log].reverse().slice(0, 60).map((e, i) => (
            <div
              key={`${e.ts}-${i}`}
              className="flex items-center gap-2 px-2 py-1 rounded bg-secondary/40"
            >
              <span className={e.ok ? "text-success" : "text-destructive"}>
                {e.ok ? "✓" : "✗"}
              </span>
              <span className="text-muted-foreground w-12 shrink-0">{e.kind}</span>
              <span className="w-14 shrink-0 text-foreground">
                {e.chainId ? `c=${e.chainId}` : "c=?"}
              </span>
              <span className="flex-1 truncate text-foreground">{e.rpcUrl}</span>
              {(e.token || e.contract) && (
                <span className="text-muted-foreground truncate max-w-[80px]">
                  {e.token ?? `${e.contract!.slice(0, 6)}…${e.contract!.slice(-4)}`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Database size={16} className="text-primary" /> Cache Storage
          </h2>
          <button
            onClick={refreshCaches}
            disabled={loadingCaches}
            className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loadingCaches ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Verify <code>js-assets</code> and <code>static-assets</code> stay bounded by the eviction policy.
        </p>
        {caches.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No caches yet. They appear after the service worker activates in production.
          </p>
        ) : (
          <div className="space-y-1 text-xs">
            {caches.map((c) => (
              <div key={c.name} className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/40">
                <span className="flex-1 font-mono text-foreground truncate">{c.name}</span>
                <span className="text-muted-foreground">{c.entries} entries</span>
                <span className="text-foreground font-semibold">{fmtBytes(c.bytes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RpcDebugPanel;
