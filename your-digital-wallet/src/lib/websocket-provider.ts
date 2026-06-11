/**
 * Real-time WebSocket connections for live chain updates.
 * Provides block updates, pending transactions, and instant balance changes.
 */

import { getActiveChainId } from "./chain-context";

export interface ChainWSConfig {
  chainId: string;
  wsUrl: string;
  type: "evm" | "solana";
}

export interface BlockUpdate {
  chainId: string;
  blockNumber: number;
  timestamp: number;
}

export interface BalanceUpdate {
  chainId: string;
  address: string;
  balance: string;
}

type Listener<T> = (data: T) => void;

const WS_CONFIGS: Record<string, ChainWSConfig> = {
  gyds: {
    chainId: "gyds",
    wsUrl: import.meta.env.VITE_GYDS_WS_URL || "wss://rpc.netlifegy.com",
    type: "evm",
  },
  ethereum: {
    chainId: "ethereum",
    wsUrl: import.meta.env.VITE_ETH_WS_URL || "wss://eth.llamarpc.com",
    type: "evm",
  },
  polygon: {
    chainId: "polygon",
    wsUrl: import.meta.env.VITE_POLYGON_WS_URL || "wss://polygon-rpc.com",
    type: "evm",
  },
  solana: {
    chainId: "solana",
    wsUrl: import.meta.env.VITE_SOLANA_WS_URL || "wss://api.mainnet-beta.solana.com",
    type: "solana",
  },
};

class ChainWebSocket {
  private ws: WebSocket | null = null;
  private config: ChainWSConfig;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private rpcId = 1;
  private blockListeners: Listener<BlockUpdate>[] = [];
  private balanceListeners: Listener<BalanceUpdate>[] = [];
  private watchedAddresses: Set<string> = new Set();
  private alive = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ChainWSConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    try {
      this.ws = new WebSocket(this.config.wsUrl);
      this.ws.onopen = () => {
        this.alive = true;
        console.log(`[WS] Connected: ${this.config.chainId}`);
        this.subscribeNewHeads();
        this.watchedAddresses.forEach((addr) => this.subscribeBalance(addr));
        this.startHeartbeat();
      };
      this.ws.onmessage = (e) => this.handleMessage(e);
      this.ws.onclose = () => {
        this.alive = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      };
      this.ws.onerror = () => {
        this.alive = false;
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.alive = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // EVM: simple eth_blockNumber ping; Solana: getHealth
        const method = this.config.type === "solana" ? "getHealth" : "eth_blockNumber";
        this.send(method, []);
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private send(method: string, params: unknown[]): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ jsonrpc: "2.0", id: this.rpcId++, method, params }));
  }

  private subscribeNewHeads(): void {
    if (this.config.type === "evm") {
      this.send("eth_subscribe", ["newHeads"]);
    } else if (this.config.type === "solana") {
      this.send("slotSubscribe", []);
    }
  }

  subscribeBalance(address: string): void {
    this.watchedAddresses.add(address);
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    if (this.config.type === "solana") {
      this.send("accountSubscribe", [address, { encoding: "jsonParsed", commitment: "confirmed" }]);
    }
    // EVM balance watching done via newHeads → re-fetch on each block
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // EVM newHeads subscription
      if (data.method === "eth_subscription" && data.params?.result?.number) {
        const blockNumber = parseInt(data.params.result.number, 16);
        const update: BlockUpdate = { chainId: this.config.chainId, blockNumber, timestamp: Date.now() };
        this.blockListeners.forEach((l) => l(update));
        // Trigger balance refresh for all watched addresses
        this.watchedAddresses.forEach((addr) => {
          this.balanceListeners.forEach((l) =>
            l({ chainId: this.config.chainId, address: addr, balance: "" })
          );
        });
      }

      // Solana slot update
      if (data.method === "slotNotification" && data.params?.result?.slot) {
        const update: BlockUpdate = { chainId: "solana", blockNumber: data.params.result.slot, timestamp: Date.now() };
        this.blockListeners.forEach((l) => l(update));
      }

      // Solana account update
      if (data.method === "accountNotification" && data.params?.result?.value) {
        const lamports = data.params.result.value.lamports;
        const balance = (lamports / 1e9).toString();
        this.watchedAddresses.forEach((addr) => {
          this.balanceListeners.forEach((l) =>
            l({ chainId: "solana", address: addr, balance })
          );
        });
      }
    } catch {
      // ignore malformed messages
    }
  }

  onBlock(listener: Listener<BlockUpdate>): () => void {
    this.blockListeners.push(listener);
    return () => { this.blockListeners = this.blockListeners.filter((l) => l !== listener); };
  }

  onBalanceChange(listener: Listener<BalanceUpdate>): () => void {
    this.balanceListeners.push(listener);
    return () => { this.balanceListeners = this.balanceListeners.filter((l) => l !== listener); };
  }

  get isConnected(): boolean { return this.alive; }
}

// ── Singleton Manager ──────────────────────────────────

class WebSocketManager {
  private connections: Map<string, ChainWebSocket> = new Map();
  private blockListeners: Listener<BlockUpdate>[] = [];
  private balanceListeners: Listener<BalanceUpdate>[] = [];

  connectChain(chainId: string): ChainWebSocket | null {
    if (this.connections.has(chainId)) return this.connections.get(chainId)!;
    const config = WS_CONFIGS[chainId];
    if (!config) return null;

    const ws = new ChainWebSocket(config);
    ws.onBlock((update) => this.blockListeners.forEach((l) => l(update)));
    ws.onBalanceChange((update) => this.balanceListeners.forEach((l) => l(update)));
    ws.connect();
    this.connections.set(chainId, ws);
    return ws;
  }

  disconnectChain(chainId: string): void {
    this.connections.get(chainId)?.disconnect();
    this.connections.delete(chainId);
  }

  disconnectAll(): void {
    this.connections.forEach((ws) => ws.disconnect());
    this.connections.clear();
  }

  watchAddress(address: string): void {
    this.connections.forEach((ws) => ws.subscribeBalance(address));
  }

  connectActiveChain(): ChainWebSocket | null {
    const activeId = getActiveChainId();
    return this.connectChain(activeId);
  }

  onBlock(listener: Listener<BlockUpdate>): () => void {
    this.blockListeners.push(listener);
    return () => { this.blockListeners = this.blockListeners.filter((l) => l !== listener); };
  }

  onBalanceChange(listener: Listener<BalanceUpdate>): () => void {
    this.balanceListeners.push(listener);
    return () => { this.balanceListeners = this.balanceListeners.filter((l) => l !== listener); };
  }

  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.connections.forEach((ws, id) => { status[id] = ws.isConnected; });
    return status;
  }
}

export const wsManager = new WebSocketManager();
