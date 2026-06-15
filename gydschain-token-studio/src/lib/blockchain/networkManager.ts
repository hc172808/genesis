import { DEVNET_CONFIG, MAINNET_CONFIG, type ChainConfig } from "./config";

/** Listeners for network changes */
type NetworkChangeListener = (config: ChainConfig) => void;
const listeners: NetworkChangeListener[] = [];

let currentConfig: ChainConfig = MAINNET_CONFIG;

// Set global reference for getActiveConfig in config.ts (avoids circular dep)
(globalThis as Record<string, unknown>).__gydsCurrentConfig = currentConfig;

export const getCurrentConfig = () => currentConfig;

export const switchNetwork = (network: "devnet" | "mainnet") => {
  currentConfig = network === "devnet" ? DEVNET_CONFIG : MAINNET_CONFIG;
  (globalThis as Record<string, unknown>).__gydsCurrentConfig = currentConfig;
  listeners.forEach((fn) => fn(currentConfig));
  console.info(`[Network] Switched to ${currentConfig.networkName}`);
};

export const onNetworkChange = (fn: NetworkChangeListener) => {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
};
