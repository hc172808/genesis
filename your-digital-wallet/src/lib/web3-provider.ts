/**
 * Web3 Provider Injection — exposes window.ethereum so external dApps
 * can detect and connect to this wallet automatically.
 */

import { getWalletAddress } from "./wallet-core";
import { getActiveChainId } from "./chain-context";
import { getChainById, SUPPORTED_CHAINS } from "./chain-adapter";
import { addPendingRequest, getSession, saveSession, type DAppSession } from "./dapp-connector";

interface EthereumRequest {
  method: string;
  params?: unknown[];
}

type EventHandler = (...args: unknown[]) => void;

class GYDSProvider {
  isGYDS = true;
  isMetaMask = false; // Don't impersonate MetaMask
  private _events: Record<string, EventHandler[]> = {};
  private _chainId: string;
  private _networkVersion: string;

  constructor() {
    const chainId = getActiveChainId();
    const chain = getChainById(chainId);
    this._chainId = chain?.chainId ? `0x${chain.chainId.toString(16)}` : "0x343a";
    this._networkVersion = chain?.chainId?.toString() || "13370";
  }

  get chainId() { return this._chainId; }
  get networkVersion() { return this._networkVersion; }
  get selectedAddress() { return getWalletAddress(); }
  get isConnected() { return true; }

  // ── EIP-1193 request method ─────────────────────────────

  async request({ method, params = [] }: EthereumRequest): Promise<unknown> {
    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts": {
        const addr = getWalletAddress();
        if (!addr) return [];
        // Auto-save session for the calling dApp
        this._autoSession();
        return [addr];
      }

      case "eth_chainId":
        return this._chainId;

      case "net_version":
        return this._networkVersion;

      case "wallet_switchEthereumChain": {
        const p = (params as { chainId: string }[])[0];
        if (p?.chainId) {
          const decimal = parseInt(p.chainId, 16);
          const found = this._findChainByDecimalId(decimal);
          if (found) {
            this._chainId = p.chainId;
            this._networkVersion = decimal.toString();
            this.emit("chainChanged", p.chainId);
            return null;
          }
        }
        throw { code: 4902, message: "Unrecognized chain" };
      }

      // Methods requiring user approval go through the pending queue
      case "eth_sendTransaction":
      case "personal_sign":
      case "eth_sign":
      case "eth_signTypedData_v4": {
        addPendingRequest(method, params as unknown[], window.location.origin);
        throw { code: 4001, message: "User approval required — check the wallet" };
      }

      // Pass-through to RPC for read-only calls
      case "eth_blockNumber":
      case "eth_getBalance":
      case "eth_call":
      case "eth_estimateGas":
      case "eth_gasPrice":
      case "eth_getTransactionReceipt":
      case "eth_getTransactionByHash":
      case "eth_getCode":
      case "eth_getLogs": {
        return this._rpcForward(method, params);
      }

      default:
        return this._rpcForward(method, params);
    }
  }

  // ── Legacy send/sendAsync ────────────────────────────────

  send(method: string | EthereumRequest, paramsOrCallback?: unknown[] | ((err: Error | null, res: unknown) => void)) {
    if (typeof method === "string") {
      return this.request({ method, params: paramsOrCallback as unknown[] });
    }
    return this.request(method);
  }

  sendAsync(payload: EthereumRequest & { id: number }, callback: (err: Error | null, res: unknown) => void) {
    this.request(payload)
      .then((result) => callback(null, { id: payload.id, jsonrpc: "2.0", result }))
      .catch((err) => callback(err, null));
  }

  // ── EIP-1193 events ─────────────────────────────────────

  on(event: string, handler: EventHandler) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(handler);
  }

  removeListener(event: string, handler: EventHandler) {
    this._events[event] = (this._events[event] || []).filter((h) => h !== handler);
  }

  removeAllListeners(event?: string) {
    if (event) delete this._events[event];
    else this._events = {};
  }

  emit(event: string, ...args: unknown[]) {
    (this._events[event] || []).forEach((h) => h(...args));
  }

  // ── Internals ───────────────────────────────────────────

  private _findChainByDecimalId(id: number) {
    return SUPPORTED_CHAINS.find((c) => c.chainId === id);
  }

  private async _rpcForward(method: string, params: unknown[]): Promise<unknown> {
    const chainId = getActiveChainId();
    const chain = getChainById(chainId);
    if (!chain || chain.type !== "evm") throw new Error("No EVM RPC available");

    const rpcUrl = chain.rpcUrls[0];
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const json = await res.json();
    if (json.error) throw json.error;
    return json.result;
  }

  private _autoSession() {
    const origin = window.location.origin;
    const existing = getSession(origin);
    if (!existing) {
      const session: DAppSession = {
        origin,
        name: document.title || origin,
        connectedAt: Date.now(),
        lastActive: Date.now(),
        permissions: ["eth_accounts"],
      };
      saveSession(session);
    }
  }

  // Notify chain/account changes externally
  updateChain(hexChainId: string) {
    this._chainId = hexChainId;
    this._networkVersion = parseInt(hexChainId, 16).toString();
    this.emit("chainChanged", hexChainId);
  }

  updateAccount(address: string | null) {
    this.emit("accountsChanged", address ? [address] : []);
  }
}

// ── Inject into window ───────────────────────────────────

let providerInstance: GYDSProvider | null = null;

export const injectWeb3Provider = (): GYDSProvider => {
  if (providerInstance) return providerInstance;
  providerInstance = new GYDSProvider();

  // Only inject if no existing provider or if explicitly enabled
  const injectEnabled = import.meta.env.VITE_INJECT_WEB3_PROVIDER !== "false";
  if (injectEnabled) {
    (window as any).ethereum = providerInstance;
    // EIP-6963 announcement
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: {
          info: {
            uuid: "gyds-wallet-provider-v1",
            name: "GYDS Wallet",
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'>G</text></svg>",
            rdns: "com.gyds.wallet",
          },
          provider: providerInstance,
        },
      })
    );
  }

  return providerInstance;
};

export const getWeb3Provider = (): GYDSProvider | null => providerInstance;
