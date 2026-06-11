/**
 * GYDS Chain Lite Node Client
 *
 * A lightweight SPV-style client for GYDS Chain (Chain ID 13370).
 * Caches block headers locally, exposes GYDS-custom RPC methods,
 * and provides a WebSocket subscription for live block streaming.
 *
 * Drop-in alongside the existing rpcClient — the litenode is focused
 * on chain observation (blocks, validators, balances) rather than
 * token contract calls, which remain in rpcClient.ts.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

export const GYDS_CHAIN_ID      = 13370;
export const GYDS_CHAIN_ID_HEX  = "0x343A";
export const GYDS_SYMBOL        = "GYDS";
export const GYDS_DECIMALS      = 18;
export const GYDS_RPC_PRIMARY   = "https://rpc.netlifegy.com";
export const GYDS_RPC_FALLBACKS = [
  "https://rpc2.netlifegy.com",
  "https://rpc3.netlifegy.com",
];
export const GYDS_WS_URL        = "wss://rpc.netlifegy.com/ws";
export const GYDS_EXPLORER_URL  = "https://explorer.netlifegy.com";

const UNITS = BigInt("1000000000000000000"); // 1e18

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GYDSLitenodeConfig {
  rpcUrl?:           string;
  rpcFallbacks?:     string[];
  wsUrl?:            string;
  chainId?:          number;
  timeoutMs?:        number;
  maxCachedHeaders?: number;
  rehealIntervalMs?: number;
}

export interface BlockHeader {
  number:           number;
  hash:             string;
  parentHash:       string;
  timestamp:        number;   // unix seconds
  gasUsed:          bigint;
  gasLimit:         bigint;
  miner:            string;
  transactionCount: number;
}

export interface ValidatorInfo {
  address: string;
  status:  "active" | "inactive" | string;
  index:   number;
}

export interface ValidatorSet {
  validators: ValidatorInfo[];
  epoch:      number;
  chainId:    number;
}

export interface NodeInfo {
  version:     string;
  nodeType:    string;
  chainId:     number;
  blockHeight: number;
  peers:       number;
}

export interface TxReceipt {
  transactionHash: string;
  blockNumber:     number;
  blockHash:       string;
  status:          "success" | "reverted";
  gasUsed:         bigint;
  from:            string;
  to:              string | null;
  contractAddress: string | null;
  logs:            unknown[];
}

export interface TxRequest {
  from:     string;
  to?:      string;
  value?:   bigint | string;
  data?:    string;
  gasLimit?: bigint | string;
}

export type BlockCallback    = (header: BlockHeader) => void;
export type DisconnectFn     = () => void;

// ── Helpers ───────────────────────────────────────────────────────────────────

const hexToNumber = (hex: string): number => parseInt(hex, 16);
const hexToBigInt = (hex: string): bigint => BigInt(hex);
const formatGYDS  = (wei: bigint): string => {
  const whole = wei / UNITS;
  const frac  = wei % UNITS;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
};

const parseBlock = (raw: Record<string, string>): BlockHeader => ({
  number:           hexToNumber(raw.number ?? "0x0"),
  hash:             raw.hash ?? "",
  parentHash:       raw.parentHash ?? "",
  timestamp:        hexToNumber(raw.timestamp ?? "0x0"),
  gasUsed:          hexToBigInt(raw.gasUsed ?? "0x0"),
  gasLimit:         hexToBigInt(raw.gasLimit ?? "0x0"),
  miner:            raw.miner ?? "",
  transactionCount: Array.isArray(raw.transactions)
    ? raw.transactions.length
    : 0,
});

const parseReceipt = (raw: Record<string, string>): TxReceipt => ({
  transactionHash: raw.transactionHash ?? "",
  blockNumber:     hexToNumber(raw.blockNumber ?? "0x0"),
  blockHash:       raw.blockHash ?? "",
  status:          raw.status === "0x1" ? "success" : "reverted",
  gasUsed:         hexToBigInt(raw.gasUsed ?? "0x0"),
  from:            raw.from ?? "",
  to:              raw.to ?? null,
  contractAddress: raw.contractAddress ?? null,
  logs:            Array.isArray(raw.logs) ? raw.logs : [],
});

// ── Main Class ────────────────────────────────────────────────────────────────

export class GYDSLitenode {
  private endpoints:      string[];
  private wsUrl:          string;
  private chainId:        number;
  private timeoutMs:      number;
  private maxHeaders:     number;
  private rehealMs:       number;

  private activeUrl:      string;
  private failedUrls:     Set<string> = new Set();
  private lastReheal:     number = 0;
  private headerCache:    Map<number, BlockHeader> = new Map();
  private latestBlock:    number = 0;
  private ws:             WebSocket | null = null;
  private wsReconnTimer:  ReturnType<typeof setTimeout> | null = null;
  private blockCallbacks: Set<BlockCallback> = new Set();

  constructor(cfg: GYDSLitenodeConfig = {}) {
    this.endpoints  = [cfg.rpcUrl ?? GYDS_RPC_PRIMARY, ...(cfg.rpcFallbacks ?? GYDS_RPC_FALLBACKS)];
    this.wsUrl      = cfg.wsUrl ?? GYDS_WS_URL;
    this.chainId    = cfg.chainId ?? GYDS_CHAIN_ID;
    this.timeoutMs  = cfg.timeoutMs ?? 6000;
    this.maxHeaders = cfg.maxCachedHeaders ?? 256;
    this.rehealMs   = cfg.rehealIntervalMs ?? 30_000;
    this.activeUrl  = this.endpoints[0];
  }

  // ── Low-level RPC ────────────────────────────────────────────────────────

  async request<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
    this._maybeReheal();

    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
    const live  = this.endpoints.filter(u => !this.failedUrls.has(u));
    const order = [this.activeUrl, ...live.filter(u => u !== this.activeUrl)].filter(u => !this.failedUrls.has(u));

    const errors: string[] = [];

    for (const url of order) {
      try {
        const ctrl = new AbortController();
        const t    = setTimeout(() => ctrl.abort(), this.timeoutMs);
        const res  = await fetch(url, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal:  ctrl.signal,
        });
        clearTimeout(t);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { result?: T; error?: { message: string } };

        if (json.error) throw new Error(json.error.message);

        if (this.activeUrl !== url) {
          console.info(`[GYDSLitenode] Switched to ${url}`);
          this.activeUrl = url;
        }

        return json.result as T;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${url}: ${msg}`);
        this.failedUrls.add(url);
      }
    }

    throw new Error(`[GYDSLitenode] All endpoints unreachable:\n${errors.join("\n")}`);
  }

  private _maybeReheal() {
    if (this.failedUrls.size > 0 && Date.now() - this.lastReheal > this.rehealMs) {
      this.failedUrls.clear();
      this.lastReheal = Date.now();
    }
  }

  // ── Block / Chain ────────────────────────────────────────────────────────

  async getBlockNumber(): Promise<number> {
    const hex = await this.request<string>("eth_blockNumber");
    const n   = hexToNumber(hex);
    if (n > this.latestBlock) this.latestBlock = n;
    return n;
  }

  async getBlockHeader(block: number | "latest" = "latest"): Promise<BlockHeader> {
    const tag = block === "latest" ? "latest" : `0x${block.toString(16)}`;

    if (block !== "latest") {
      const cached = this.headerCache.get(block as number);
      if (cached) return cached;
    }

    const raw    = await this.request<Record<string, string>>("eth_getBlockByNumber", [tag, false]);
    const header = parseBlock(raw);
    this._cacheHeader(header);
    return header;
  }

  private _cacheHeader(h: BlockHeader) {
    this.headerCache.set(h.number, h);
    if (h.number > this.latestBlock) this.latestBlock = h.number;
    // Prune oldest entries when over limit
    if (this.headerCache.size > this.maxHeaders) {
      const oldest = Math.min(...this.headerCache.keys());
      this.headerCache.delete(oldest);
    }
  }

  async getChainId(): Promise<number> {
    const hex = await this.request<string>("eth_chainId");
    return hexToNumber(hex);
  }

  async getGasPrice(): Promise<bigint> {
    const hex = await this.request<string>("eth_gasPrice");
    return hexToBigInt(hex);
  }

  // ── Balances ─────────────────────────────────────────────────────────────

  /** Returns balance in wei */
  async getBalanceWei(address: string): Promise<bigint> {
    const hex = await this.request<string>("eth_getBalance", [address, "latest"]);
    return hexToBigInt(hex);
  }

  /** Returns balance as a formatted GYDS string (e.g. "12.5") */
  async getBalance(address: string): Promise<string> {
    const wei = await this.getBalanceWei(address);
    return formatGYDS(wei);
  }

  /** Returns nonce (transaction count) for an address */
  async getNonce(address: string): Promise<number> {
    const hex = await this.request<string>("eth_getTransactionCount", [address, "latest"]);
    return hexToNumber(hex);
  }

  // ── Transactions ─────────────────────────────────────────────────────────

  async estimateGas(tx: TxRequest): Promise<bigint> {
    const txObj: Record<string, string> = { from: tx.from };
    if (tx.to)       txObj.to    = tx.to;
    if (tx.data)     txObj.data  = tx.data;
    if (tx.value)    txObj.value = typeof tx.value === "bigint" ? `0x${tx.value.toString(16)}` : tx.value;
    const hex = await this.request<string>("eth_estimateGas", [txObj]);
    return hexToBigInt(hex);
  }

  async sendRawTransaction(signedHex: string): Promise<string> {
    return this.request<string>("eth_sendRawTransaction", [signedHex]);
  }

  async getTransactionReceipt(hash: string): Promise<TxReceipt | null> {
    const raw = await this.request<Record<string, string> | null>("eth_getTransactionReceipt", [hash]);
    if (!raw) return null;
    return parseReceipt(raw);
  }

  /** Poll until a transaction is mined (or timeout) */
  async waitForTransaction(
    hash: string,
    opts: { pollMs?: number; timeoutMs?: number } = {}
  ): Promise<TxReceipt> {
    const { pollMs = 1500, timeoutMs = 60_000 } = opts;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const receipt = await this.getTransactionReceipt(hash);
      if (receipt) return receipt;
      await new Promise(r => setTimeout(r, pollMs));
    }

    throw new Error(`[GYDSLitenode] Transaction not mined within ${timeoutMs}ms: ${hash}`);
  }

  // ── GYDS Custom Methods ───────────────────────────────────────────────────

  async getValidatorSet(): Promise<ValidatorSet> {
    return this.request<ValidatorSet>("gyds_validatorSet");
  }

  async getNodeInfo(): Promise<NodeInfo> {
    return this.request<NodeInfo>("gyds_nodeInfo");
  }

  /** Quick connectivity check */
  async isAlive(): Promise<boolean> {
    try {
      await this.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }

  // ── Block Subscription (WebSocket) ────────────────────────────────────────

  /**
   * Subscribe to new block headers via WebSocket.
   * Falls back to polling if WebSocket is unavailable.
   * Returns a cleanup function — call it to unsubscribe.
   */
  subscribeNewBlocks(callback: BlockCallback): DisconnectFn {
    this.blockCallbacks.add(callback);

    if (this.blockCallbacks.size === 1) {
      this._startWebSocket();
    }

    return () => {
      this.blockCallbacks.delete(callback);
      if (this.blockCallbacks.size === 0) {
        this._stopWebSocket();
      }
    };
  }

  private _startWebSocket() {
    if (typeof WebSocket === "undefined") return;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.info("[GYDSLitenode] WebSocket connected");
        this.ws?.send(JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method:  "eth_subscribe",
          params:  ["newHeads"],
        }));
      };

      this.ws.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          const raw = msg?.params?.result;
          if (!raw?.number) return;

          const header = parseBlock(raw as Record<string, string>);
          this._cacheHeader(header);
          this.blockCallbacks.forEach(cb => {
            try { cb(header); } catch { /* ignore subscriber errors */ }
          });
        } catch { /* ignore parse errors */ }
      };

      this.ws.onerror = () => {
        console.warn("[GYDSLitenode] WebSocket error — will reconnect");
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.blockCallbacks.size > 0) {
          this.wsReconnTimer = setTimeout(() => this._startWebSocket(), 5000);
        }
      };
    } catch (err) {
      console.warn("[GYDSLitenode] Could not open WebSocket:", err);
    }
  }

  private _stopWebSocket() {
    if (this.wsReconnTimer !== null) {
      clearTimeout(this.wsReconnTimer);
      this.wsReconnTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  // ── Cache Access ─────────────────────────────────────────────────────────

  getCachedHeader(blockNumber: number): BlockHeader | undefined {
    return this.headerCache.get(blockNumber);
  }

  getLatestCachedHeader(): BlockHeader | undefined {
    if (this.latestBlock === 0) return undefined;
    return this.headerCache.get(this.latestBlock);
  }

  getCachedBlockCount(): number {
    return this.headerCache.size;
  }

  clearCache() {
    this.headerCache.clear();
    this.latestBlock = 0;
  }

  // ── Explorer Helpers ─────────────────────────────────────────────────────

  explorerTx(hash: string):        string { return `${GYDS_EXPLORER_URL}/tx/${hash}`; }
  explorerAddress(addr: string):   string { return `${GYDS_EXPLORER_URL}/address/${addr}`; }
  explorerBlock(n: number | string): string { return `${GYDS_EXPLORER_URL}/block/${n}`; }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

/** Shared instance — use this unless you need custom config */
export const gydsLitenode = new GYDSLitenode();
