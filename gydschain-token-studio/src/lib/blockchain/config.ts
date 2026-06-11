export interface ChainConfig {
  networkName: string;
  rpcUrl: string;
  rpcFallbacks: string[];
  chainId: number;
  explorerUrl: string;
  indexerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  fees: {
    tokenCreation: number;
    feeCollectorAddress: string;
  };
}

export const GYDS_CHAIN_ID = 13370;

export const DEVNET_CONFIG: ChainConfig = {
  networkName: "GYDS Chain",
  rpcUrl: "https://rpc.netlifegy.com",
  rpcFallbacks: [
    "https://rpc2.netlifegy.com",
    "https://rpc3.netlifegy.com",
    "https://localhost:8546",
    "https://192.168.18.106:8546",
  ],
  chainId: GYDS_CHAIN_ID,
  explorerUrl: "https://explorer.netlifegy.com",
  indexerUrl: "https://rpc.netlifegy.com",
  nativeCurrency: {
    name: "GYDS",
    symbol: "GYDS",
    decimals: 18,
  },
  fees: {
    tokenCreation: 0.5,
    feeCollectorAddress: "0xNetlifyGY_FeeCollector",
  },
};

export const MAINNET_CONFIG: ChainConfig = {
  networkName: "GYDS Chain",
  rpcUrl: "https://rpc.netlifegy.com",
  rpcFallbacks: [
    "https://rpc2.netlifegy.com",
    "https://rpc3.netlifegy.com",
  ],
  chainId: GYDS_CHAIN_ID,
  explorerUrl: "https://explorer.netlifegy.com",
  indexerUrl: "https://rpc.netlifegy.com",
  nativeCurrency: {
    name: "GYDS",
    symbol: "GYDS",
    decimals: 18,
  },
  fees: {
    tokenCreation: 1.0,
    feeCollectorAddress: "0xNetlifyGY_FeeCollector_Mainnet",
  },
};

export const activeConfig: ChainConfig = MAINNET_CONFIG;

/** Get the currently active config (respects network switching) */
export const getActiveConfig = (): ChainConfig => {
  // Import dynamically to avoid circular dependency at module init
  return (globalThis as Record<string, unknown>).__gydsCurrentConfig as ChainConfig ?? activeConfig;
};

export const getExplorerUrl = (type: "tx" | "token" | "address", hash: string) => {
  return `${activeConfig.explorerUrl}/${type}/${hash}`;
};
