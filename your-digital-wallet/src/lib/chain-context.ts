/**
 * Chain selection context — tracks which chain the user is currently viewing.
 * Persisted to localStorage so it survives page reloads.
 */

const ACTIVE_CHAIN_KEY = "gyds_active_chain";

export const getActiveChainId = (): string => {
  return localStorage.getItem(ACTIVE_CHAIN_KEY) || "gyds";
};

export const setActiveChainId = (chainId: string): void => {
  localStorage.setItem(ACTIVE_CHAIN_KEY, chainId);
};
