/**
 * Chain Abstraction Layer
 * Provides a unified interface for multi-chain support (EVM + Solana).
 * Per-chain transaction builders, signing logic, and RPC management.
 */

import { ethers } from "ethers";
import { getActiveRpc, getNetworkConfig } from "./network-config";

// ── Chain Types ─────────────────────────────────────────

export type ChainType = "evm" | "solana";

export interface ChainConfig {
  id: string;
  name: string;
  type: ChainType;
  chainId?: number;        // EVM only
  symbol: string;
  decimals: number;
  rpcUrls: string[];
  blockExplorer: string;
  logo?: string;
  enabled: boolean;
}

export interface TransactionRequest {
  chainId: string;
  from: string;
  to: string;
  value: string;
  data?: string;
  tokenAddress?: string;   // For token transfers
  tokenDecimals?: number;
}

export interface TransactionResult {
  hash: string;
  chainId: string;
  status: "pending" | "confirmed" | "failed";
  blockNumber?: number;
  gasUsed?: string;
}

export interface ChainBalance {
  native: string;
  tokens: Record<string, string>;
}

// ── Built-in Chain Configs ──────────────────────────────

const STORAGE_KEY = "gyds_enabled_chains";

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: "gyds",
    name: "GYDS Network",
    type: "evm",
    chainId: 13370,
    symbol: "GYDS",
    decimals: 18,
    rpcUrls: ["https://rpc.netlifegy.com", "https://rpc2.netlifegy.com", "https://rpc3.netlifegy.com"],
    blockExplorer: "https://explorer.netlifegy.com",
    enabled: true,
  },
  {
    id: "ethereum",
    name: "Ethereum",
    type: "evm",
    chainId: 1,
    symbol: "ETH",
    decimals: 18,
    rpcUrls: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
    blockExplorer: "https://etherscan.io",
    enabled: false,
  },
  {
    id: "polygon",
    name: "Polygon",
    type: "evm",
    chainId: 137,
    symbol: "MATIC",
    decimals: 18,
    rpcUrls: ["https://polygon-rpc.com", "https://rpc.ankr.com/polygon"],
    blockExplorer: "https://polygonscan.com",
    enabled: false,
  },
  {
    id: "solana",
    name: "Solana",
    type: "solana",
    symbol: "SOL",
    decimals: 9,
    rpcUrls: ["https://api.mainnet-beta.solana.com"],
    blockExplorer: "https://solscan.io",
    enabled: false,
  },
];

// ── Chain Management ────────────────────────────────────

const RPC_OVERRIDE_KEY = "gyds_chain_rpc_overrides";
const CHAIN_DISABLED_KEY = "gyds_chain_force_disabled";

interface ChainOverrides {
  [chainId: string]: { rpcUrls?: string[] };
}

const getRpcOverrides = (): ChainOverrides => {
  try { return JSON.parse(localStorage.getItem(RPC_OVERRIDE_KEY) || "{}"); }
  catch { return {}; }
};

export const setChainRpcUrls = (chainId: string, urls: string[]): void => {
  const ov = getRpcOverrides();
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);
  if (cleaned.length === 0) delete ov[chainId];
  else ov[chainId] = { ...ov[chainId], rpcUrls: cleaned };
  localStorage.setItem(RPC_OVERRIDE_KEY, JSON.stringify(ov));
};

export const resetChainRpcUrls = (chainId: string): void => {
  const ov = getRpcOverrides();
  delete ov[chainId];
  localStorage.setItem(RPC_OVERRIDE_KEY, JSON.stringify(ov));
};

const getDisabledChains = (): string[] => {
  try { return JSON.parse(localStorage.getItem(CHAIN_DISABLED_KEY) || "[]"); }
  catch { return []; }
};

export const setChainForceDisabled = (chainId: string, disabled: boolean): void => {
  const cur = new Set(getDisabledChains());
  if (disabled) cur.add(chainId); else cur.delete(chainId);
  localStorage.setItem(CHAIN_DISABLED_KEY, JSON.stringify([...cur]));
};

export const isChainForceDisabled = (chainId: string): boolean =>
  getDisabledChains().includes(chainId);

// ── Per-URL disable list (admin can blacklist a single bad RPC URL) ──
const RPC_URL_DISABLED_KEY = "gyds_chain_rpc_url_disabled";
const getDisabledUrls = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RPC_URL_DISABLED_KEY) || "[]"); }
  catch { return []; }
};
export const isRpcUrlDisabled = (url: string): boolean =>
  getDisabledUrls().includes(url);
export const setRpcUrlDisabled = (url: string, disabled: boolean): void => {
  const cur = new Set(getDisabledUrls());
  if (disabled) cur.add(url); else cur.delete(url);
  localStorage.setItem(RPC_URL_DISABLED_KEY, JSON.stringify([...cur]));
};
export const getDisabledRpcUrls = (): string[] => getDisabledUrls();

const applyOverrides = (c: ChainConfig): ChainConfig => {
  const ov = getRpcOverrides()[c.id];
  const base = ov?.rpcUrls?.length ? { ...c, rpcUrls: ov.rpcUrls } : c;
  // Filter out admin-disabled URLs at runtime so failover skips them
  const disabled = new Set(getDisabledUrls());
  const filtered = base.rpcUrls.filter((u) => !disabled.has(u));
  return { ...base, rpcUrls: filtered.length ? filtered : base.rpcUrls };
};

export const getEnabledChains = (): ChainConfig[] => {
  const disabled = new Set(getDisabledChains());
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const enabledIds: string[] = JSON.parse(stored);
      return SUPPORTED_CHAINS.map((c) => applyOverrides({
        ...c,
        enabled: enabledIds.includes(c.id) && !disabled.has(c.id),
      }));
    }
  } catch { /* fallback */ }
  return SUPPORTED_CHAINS.map((c) => applyOverrides({
    ...c, enabled: c.enabled && !disabled.has(c.id),
  }));
};

export const setChainEnabled = (chainId: string, enabled: boolean): void => {
  const chains = getEnabledChains();
  const updated = chains.map((c) =>
    c.id === chainId ? { ...c, enabled } : c
  );
  const enabledIds = updated.filter((c) => c.enabled).map((c) => c.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledIds));
};

export const getChainById = (id: string): ChainConfig | undefined => {
  const base = SUPPORTED_CHAINS.find((c) => c.id === id);
  return base ? applyOverrides(base) : undefined;
};

export const getActiveChains = (): ChainConfig[] => {
  return getEnabledChains().filter((c) => c.enabled);
};

// ── EVM Chain Adapter ───────────────────────────────────

export class EVMAdapter {
  private config: ChainConfig;

  constructor(config: ChainConfig) {
    if (config.type !== "evm") throw new Error("Not an EVM chain");
    this.config = config;
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    // For GYDS, use the active RPC from failover system
    if (this.config.id === "gyds") {
      const rpc = await getActiveRpc();
      return new ethers.JsonRpcProvider(rpc || this.config.rpcUrls[0]);
    }
    // For other EVM chains, try RPCs in order
    for (const url of this.config.rpcUrls) {
      try {
        const provider = new ethers.JsonRpcProvider(url);
        await provider.getBlockNumber();
        return provider;
      } catch { continue; }
    }
    return new ethers.JsonRpcProvider(this.config.rpcUrls[0]);
  }

  async getNativeBalance(address: string): Promise<string> {
    const provider = await this.getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatUnits(balance, this.config.decimals);
  }

  async getTokenBalance(tokenAddress: string, walletAddress: string, decimals = 18): Promise<string> {
    const provider = await this.getProvider();
    const abi = ["function balanceOf(address) view returns (uint256)"];
    const contract = new ethers.Contract(tokenAddress, abi, provider);
    const balance = await contract.balanceOf(walletAddress);
    return ethers.formatUnits(balance, decimals);
  }

  async estimateGas(tx: TransactionRequest): Promise<{ gasPrice: bigint; gasLimit: bigint; totalFee: string }> {
    const provider = await this.getProvider();
    const gasPrice = (await provider.getFeeData()).gasPrice || 0n;
    const gasLimit = await provider.estimateGas({
      from: tx.from,
      to: tx.to,
      value: ethers.parseUnits(tx.value, this.config.decimals),
      data: tx.data,
    });
    const totalFee = ethers.formatUnits(gasPrice * gasLimit, this.config.decimals);
    return { gasPrice, gasLimit, totalFee };
  }

  async sendTransaction(wallet: ethers.Wallet, tx: TransactionRequest): Promise<TransactionResult> {
    const provider = await this.getProvider();
    const connectedWallet = wallet.connect(provider);

    let txResponse: ethers.TransactionResponse;

    if (tx.tokenAddress) {
      // ERC-20 transfer
      const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
      const contract = new ethers.Contract(tx.tokenAddress, abi, connectedWallet);
      const amount = ethers.parseUnits(tx.value, tx.tokenDecimals || 18);
      txResponse = await contract.transfer(tx.to, amount);
    } else {
      // Native transfer
      txResponse = await connectedWallet.sendTransaction({
        to: tx.to,
        value: ethers.parseUnits(tx.value, this.config.decimals),
      });
    }

    return {
      hash: txResponse.hash,
      chainId: this.config.id,
      status: "pending",
    };
  }

  async getTransactionReceipt(hash: string): Promise<TransactionResult> {
    const provider = await this.getProvider();
    const receipt = await provider.getTransactionReceipt(hash);
    return {
      hash,
      chainId: this.config.id,
      status: receipt ? (receipt.status === 1 ? "confirmed" : "failed") : "pending",
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  async getBlockNumber(): Promise<number> {
    const provider = await this.getProvider();
    return provider.getBlockNumber();
  }

  async getGasPrice(): Promise<string> {
    const provider = await this.getProvider();
    const feeData = await provider.getFeeData();
    return ethers.formatUnits(feeData.gasPrice || 0n, "gwei");
  }
}

// ── Solana Adapter (Stub — requires @solana/web3.js) ────

export class SolanaAdapter {
  private config: ChainConfig;

  constructor(config: ChainConfig) {
    if (config.type !== "solana") throw new Error("Not a Solana chain");
    this.config = config;
  }

  async getNativeBalance(_address: string): Promise<string> {
    // Stub: requires @solana/web3.js
    console.warn("Solana support requires @solana/web3.js — install to enable");
    return "0";
  }

  async sendTransaction(_from: string, _to: string, _amount: string): Promise<TransactionResult> {
    throw new Error("Solana transactions require @solana/web3.js. Install with: npm i @solana/web3.js");
  }
}

// ── Factory ─────────────────────────────────────────────

export const getAdapter = (chainId: string): EVMAdapter | SolanaAdapter => {
  const chain = getChainById(chainId);
  if (!chain) throw new Error(`Unknown chain: ${chainId}`);
  if (chain.type === "evm") return new EVMAdapter(chain);
  if (chain.type === "solana") return new SolanaAdapter(chain);
  throw new Error(`Unsupported chain type: ${chain.type}`);
};
