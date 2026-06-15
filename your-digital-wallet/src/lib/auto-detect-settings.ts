/**
 * Auto-detection toggles persisted in localStorage.
 *
 * - `auto-detect tokens`: well-known ERC-20s discovered by on-chain balance scan
 *   (drives <TokenDiscovery />).
 * - `auto-detect custom tokens`: imported / user-saved tokens are auto-refreshed
 *   on dashboard mount.
 *
 * Both default to ENABLED for new installs.
 */

const KEY_TOKENS = "gyds_auto_detect_tokens";
const KEY_CUSTOM = "gyds_auto_detect_custom_tokens";

const read = (key: string): boolean => {
  const v = localStorage.getItem(key);
  return v === null ? true : v === "1";
};

const write = (key: string, on: boolean): void => {
  localStorage.setItem(key, on ? "1" : "0");
};

export const isAutoDetectTokensEnabled = () => read(KEY_TOKENS);
export const setAutoDetectTokensEnabled = (on: boolean) => write(KEY_TOKENS, on);

export const isAutoDetectCustomTokensEnabled = () => read(KEY_CUSTOM);
export const setAutoDetectCustomTokensEnabled = (on: boolean) => write(KEY_CUSTOM, on);
