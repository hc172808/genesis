// Token hide/unhide system

const STORAGE_KEY = "gyds_hidden_tokens";

export const getHiddenTokens = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const hideToken = (symbol: string): void => {
  const hidden = getHiddenTokens();
  const upper = symbol.toUpperCase();
  if (!hidden.includes(upper)) {
    hidden.push(upper);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
  }
};

export const unhideToken = (symbol: string): void => {
  const hidden = getHiddenTokens().filter((s) => s !== symbol.toUpperCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
};

export const isTokenHidden = (symbol: string): boolean => {
  return getHiddenTokens().includes(symbol.toUpperCase());
};
