/**
 * Real EVM wallet adapter for GydsChain.
 * Supports MetaMask-compatible injected providers (window.ethereum).
 * Maps wallet IDs to their respective provider detection.
 */

import { activeConfig } from "./config";

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    phantom?: { ethereum?: EthereumProvider };
    solflare?: { ethereum?: EthereumProvider };
    backpack?: { ethereum?: EthereumProvider };
  }
}

export interface EthereumProvider {
  isMetaMask?: boolean;
  isPhantom?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  selectedAddress?: string | null;
}

/** Detect available provider for a given wallet type */
export const getProvider = (walletType: string): EthereumProvider | null => {
  if (typeof window === "undefined") return null;

  switch (walletType) {
    case "phantom":
      return window.phantom?.ethereum ?? window.ethereum ?? null;
    case "solflare":
      return window.solflare?.ethereum ?? window.ethereum ?? null;
    case "backpack":
      return window.backpack?.ethereum ?? window.ethereum ?? null;
    case "gyds-wallet":
    default:
      return window.ethereum ?? null;
  }
};

/** Check if any EVM provider is available */
export const isWalletAvailable = (walletType: string): boolean => {
  return getProvider(walletType) !== null;
};

/** Request wallet connection — returns array of addresses */
export const requestAccounts = async (provider: EthereumProvider): Promise<string[]> => {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  return accounts;
};

/** Get current accounts without prompting */
export const getAccounts = async (provider: EthereumProvider): Promise<string[]> => {
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  return accounts;
};

/** Get native balance in wei (hex) */
export const getWalletBalance = async (provider: EthereumProvider, address: string): Promise<string> => {
  const balance = (await provider.request({
    method: "eth_getBalance",
    params: [address, "latest"],
  })) as string;
  return balance;
};

/** Get current chain ID (hex) */
export const getWalletChainId = async (provider: EthereumProvider): Promise<string> => {
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  return chainId;
};

/** Switch to GydsChain network, or add it if not configured */
export const switchToGydsChain = async (provider: EthereumProvider): Promise<void> => {
  const targetChainId = `0x${activeConfig.chainId.toString(16)}`;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }],
    });
  } catch (err: unknown) {
    const error = err as { code?: number };
    // Chain not added — add it
    if (error.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: targetChainId,
            chainName: activeConfig.networkName,
            nativeCurrency: activeConfig.nativeCurrency,
            rpcUrls: [activeConfig.rpcUrl, ...activeConfig.rpcFallbacks],
            blockExplorerUrls: [activeConfig.explorerUrl],
          },
        ],
      });
    } else {
      throw err;
    }
  }
};

/** Send a raw transaction */
export const sendTransaction = async (
  provider: EthereumProvider,
  tx: {
    from: string;
    to: string;
    value?: string;
    data?: string;
    gas?: string;
  }
): Promise<string> => {
  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [tx],
  })) as string;
  return txHash;
};

/** Sign a message */
export const signMessage = async (
  provider: EthereumProvider,
  address: string,
  message: string
): Promise<string> => {
  const signature = (await provider.request({
    method: "personal_sign",
    params: [message, address],
  })) as string;
  return signature;
};

/** Format address to short form */
export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/** Convert wei hex to human-readable GYDS */
export const weiHexToGyds = (hex: string): string => {
  try {
    const wei = BigInt(hex);
    const whole = wei / BigInt(10 ** 18);
    const fraction = wei % BigInt(10 ** 18);
    const fractionStr = fraction.toString().padStart(18, "0").slice(0, 2);
    return `${whole}.${fractionStr}`;
  } catch {
    return "0.00";
  }
};
