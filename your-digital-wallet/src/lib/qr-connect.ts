/**
 * QR-based connection handler.
 * Parses scanned QR data to connect to:
 * - Custom RPC nodes (JSON-RPC endpoints)
 * - External dApp websites (WalletConnect-style)
 * - Custom network configs
 */

import { saveNetworkConfig, getNetworkConfig, validateRpcUrl } from "./network-config";
import { saveSession } from "./dapp-connector";

export type QrConnectType = "rpc_node" | "dapp_site" | "wallet_address" | "unknown";

export interface QrConnectResult {
  type: QrConnectType;
  data: Record<string, string>;
  success: boolean;
  message: string;
}

/**
 * Detect what kind of data was scanned and return structured result.
 */
export const parseQrData = (raw: string): QrConnectResult => {
  const trimmed = raw.trim();

  // 1. JSON-RPC node config: { "rpc": "https://...", "name": "..." }
  try {
    const json = JSON.parse(trimmed);
    if (json.rpc || json.rpcUrl || json.endpoint) {
      const url = json.rpc || json.rpcUrl || json.endpoint;
      if (validateRpcUrl(url)) {
        return {
          type: "rpc_node",
          data: {
            url,
            name: json.name || json.networkName || "Custom Node",
            chainId: String(json.chainId || ""),
            symbol: json.symbol || "",
          },
          success: true,
          message: `Found RPC node: ${json.name || url}`,
        };
      }
    }
  } catch {
    // not JSON
  }

  // 2. Plain RPC URL: https://... or wss://...
  if (/^(https?|wss?):\/\/.+/i.test(trimmed) && !trimmed.includes("<")) {
    // Check if it's an RPC endpoint
    if (
      trimmed.includes("rpc") ||
      trimmed.includes("infura") ||
      trimmed.includes("alchemy") ||
      trimmed.includes("ankr") ||
      trimmed.includes("llamarpc") ||
      trimmed.includes("quicknode") ||
      trimmed.includes("chainstack") ||
      trimmed.endsWith("/") ||
      /:\d{4,5}/.test(trimmed)
    ) {
      return {
        type: "rpc_node",
        data: { url: trimmed, name: new URL(trimmed).hostname },
        success: true,
        message: `Found RPC endpoint: ${new URL(trimmed).hostname}`,
      };
    }
    // Otherwise it's a dApp website
    return {
      type: "dapp_site",
      data: { url: trimmed, name: new URL(trimmed).hostname, origin: new URL(trimmed).origin },
      success: true,
      message: `Found website: ${new URL(trimmed).hostname}`,
    };
  }

  // 3. Wallet address (0x...)
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return {
      type: "wallet_address",
      data: { address: trimmed },
      success: true,
      message: `Wallet address: ${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`,
    };
  }

  // 4. EIP-681 ethereum:0x...
  if (trimmed.startsWith("ethereum:")) {
    const addr = trimmed.slice(9).split(/[@/?]/)[0];
    return {
      type: "wallet_address",
      data: { address: addr },
      success: true,
      message: `Wallet address: ${addr.slice(0, 8)}...${addr.slice(-6)}`,
    };
  }

  return {
    type: "unknown",
    data: { raw: trimmed },
    success: false,
    message: "Unrecognized QR code format",
  };
};

/**
 * Add a scanned RPC node to the network config.
 */
export const addScannedNode = (url: string, name?: string): boolean => {
  try {
    const config = getNetworkConfig();
    if (config.rpcUrls.includes(url)) return false; // already exists
    const updated = { ...config, rpcUrls: [...config.rpcUrls, url] };
    saveNetworkConfig(updated);
    return true;
  } catch {
    return false;
  }
};

/**
 * Connect to a scanned dApp website by creating a session.
 */
export const connectScannedDApp = (origin: string, name: string, icon?: string): void => {
  saveSession({
    origin,
    name,
    icon,
    connectedAt: Date.now(),
    lastActive: Date.now(),
    permissions: ["eth_accounts", "eth_chainId"],
  });
};

/**
 * Test if a scanned RPC URL is responsive.
 */
export const testRpcEndpoint = async (url: string, timeoutMs = 5000): Promise<{ ok: boolean; latency: number; chainId?: number }> => {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    const data = await res.json();
    const chainId = data.result ? parseInt(data.result, 16) : undefined;
    return { ok: res.ok, latency, chainId };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
};
