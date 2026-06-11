/**
 * Lightweight in-memory + localStorage debug log of RPC requests.
 * Captures which chainId / RPC URL was used for each balance call so the
 * admin debug panel can verify per-chain routing and cache sizes.
 */

export interface RpcLogEntry {
  ts: number;
  kind: "balance" | "native" | "discovery" | "other";
  chainId?: number;
  rpcUrl: string;
  token?: string;
  contract?: string;
  ok: boolean;
  error?: string;
}

const KEY = "gyds_rpc_debug_log";
const MAX_ENTRIES = 200;
const listeners = new Set<() => void>();

function read(): RpcLogEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RpcLogEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: RpcLogEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* quota — drop */
  }
  listeners.forEach((l) => {
    try { l(); } catch { /* ignore */ }
  });
}

export function logRpcCall(entry: Omit<RpcLogEntry, "ts">) {
  const next = [...read(), { ...entry, ts: Date.now() }];
  write(next);
  // Console mirror for easier inspection during dev.
  // eslint-disable-next-line no-console
  console.debug(
    `[rpc] ${entry.kind} chain=${entry.chainId ?? "?"} ${entry.ok ? "ok" : "fail"} ` +
    `${entry.token ?? entry.contract ?? ""} via ${entry.rpcUrl}`
  );
}

export function getRpcLog(): RpcLogEntry[] {
  return read();
}

export function clearRpcLog() {
  write([]);
}

export function subscribeRpcLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Inspect Cache Storage to report bounded eviction behaviour. */
export async function getCacheStorageSizes(): Promise<
  Array<{ name: string; entries: number; bytes: number }>
> {
  if (typeof caches === "undefined") return [];
  const names = await caches.keys();
  const out: Array<{ name: string; entries: number; bytes: number }> = [];
  for (const name of names) {
    try {
      const cache = await caches.open(name);
      const reqs = await cache.keys();
      let bytes = 0;
      for (const req of reqs) {
        try {
          const res = await cache.match(req);
          if (!res) continue;
          const cl = res.headers.get("content-length");
          if (cl) {
            bytes += parseInt(cl, 10) || 0;
          } else {
            const buf = await res.clone().arrayBuffer();
            bytes += buf.byteLength;
          }
        } catch {
          /* skip entry */
        }
      }
      out.push({ name, entries: reqs.length, bytes });
    } catch {
      out.push({ name, entries: 0, bytes: 0 });
    }
  }
  return out;
}
