import { activeConfig } from "./config";

interface RpcRequest {
  method: string;
  params?: unknown[];
  id?: number;
}

interface RpcResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

interface RpcClientState {
  activeUrl: string;
  failedUrls: Set<string>;
  lastHealthCheck: number;
}

const TIMEOUT_MS = 5000;
const HEALTH_RECHECK_MS = 30_000;

const state: RpcClientState = {
  activeUrl: activeConfig.rpcUrl,
  failedUrls: new Set(),
  lastHealthCheck: 0,
};

/** All endpoints in priority order */
const getAllEndpoints = (): string[] => [
  activeConfig.rpcUrl,
  ...activeConfig.rpcFallbacks,
];

/** Raw fetch with timeout */
const fetchWithTimeout = async (
  url: string,
  body: string,
  timeoutMs = TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

/** Try a single RPC call against one URL */
const tryRpcCall = async <T>(
  url: string,
  payload: string
): Promise<RpcResponse<T>> => {
  const res = await fetchWithTimeout(url, payload);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<RpcResponse<T>>;
};

/** Re-check previously failed endpoints periodically */
const maybeRehealFailed = () => {
  if (
    state.failedUrls.size > 0 &&
    Date.now() - state.lastHealthCheck > HEALTH_RECHECK_MS
  ) {
    state.failedUrls.clear();
    state.lastHealthCheck = Date.now();
  }
};

/**
 * Send a JSON-RPC request with automatic failover.
 * Tries the active endpoint first, then cycles through fallbacks.
 */
export const rpcCall = async <T = unknown>(
  request: RpcRequest
): Promise<T> => {
  maybeRehealFailed();

  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: request.id ?? 1,
    method: request.method,
    params: request.params ?? [],
  });

  const endpoints = getAllEndpoints().filter(
    (url) => !state.failedUrls.has(url)
  );

  // Put current active URL first
  const sorted = [
    state.activeUrl,
    ...endpoints.filter((u) => u !== state.activeUrl),
  ].filter((u) => !state.failedUrls.has(u));

  const errors: string[] = [];

  for (const url of sorted) {
    try {
      const response = await tryRpcCall<T>(url, payload);

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Success — promote this endpoint
      if (state.activeUrl !== url) {
        console.info(`[RPC] Switched to fallback: ${url}`);
        state.activeUrl = url;
      }

      return response.result as T;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${url}: ${msg}`);
      state.failedUrls.add(url);
      console.warn(`[RPC] Endpoint failed: ${url} — ${msg}`);
    }
  }

  throw new Error(
    `All RPC endpoints unreachable:\n${errors.join("\n")}`
  );
};

/** Convenience: get the latest block number */
export const getBlockNumber = () =>
  rpcCall<string>({ method: "eth_blockNumber" });

/** Convenience: get balance for an address */
export const getBalance = (address: string) =>
  rpcCall<string>({ method: "eth_getBalance", params: [address, "latest"] });

/** Convenience: get chain ID */
export const getChainId = () =>
  rpcCall<string>({ method: "eth_chainId" });

/** Get the currently active RPC URL */
export const getActiveRpcUrl = () => state.activeUrl;

/** Force reset — re-enables all endpoints */
export const resetRpcState = () => {
  state.activeUrl = activeConfig.rpcUrl;
  state.failedUrls.clear();
  state.lastHealthCheck = 0;
};
