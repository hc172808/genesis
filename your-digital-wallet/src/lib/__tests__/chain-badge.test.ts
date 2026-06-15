import { describe, it, expect, beforeEach } from "vitest";
import { saveCustomToken, getCustomTokens, getChainLabel } from "@/lib/custom-tokens";

const USDC_ETH = {
  contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  color: "from-blue-500 to-cyan-400",
  chainId: 1,
};

const USDC_POLY = {
  contractAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  symbol: "USDC.e",
  name: "Bridged USDC (Polygon)",
  decimals: 6,
  color: "from-blue-500 to-cyan-400",
  chainId: 137,
};

const GYDS_TOKEN = {
  contractAddress: "0x4444444444444444444444444444444444444444",
  symbol: "MYG",
  name: "MyGydsToken",
  decimals: 18,
  color: "from-cyan-400 to-teal-500",
  chainId: 13370,
};

describe("multi-chain token import + chain badges", () => {
  beforeEach(() => localStorage.clear());

  it("imports tokens on multiple chains and labels each correctly", () => {
    saveCustomToken(USDC_ETH);
    saveCustomToken(USDC_POLY);
    saveCustomToken(GYDS_TOKEN);

    const stored = getCustomTokens();
    expect(stored).toHaveLength(3);

    const labels = stored.map((t) => getChainLabel(t.chainId));
    expect(labels).toEqual(["Ethereum", "Polygon", "GYDS"]);
  });

  it("treats same contract on different chains as separate entries", () => {
    saveCustomToken(USDC_ETH);
    // Same address, different chain — should be a new row, not an overwrite
    const same = saveCustomToken({ ...USDC_ETH, chainId: 137, symbol: "USDC.e" });
    expect(same.added).toBe(true);
    expect(getCustomTokens()).toHaveLength(2);
  });

  it("treats same contract on same chain as duplicate", () => {
    saveCustomToken(USDC_ETH);
    const dup = saveCustomToken(USDC_ETH);
    expect(dup.duplicate).toBe(true);
    expect(getCustomTokens()).toHaveLength(1);
  });

  it("getChainLabel returns sensible defaults", () => {
    expect(getChainLabel(1)).toBe("Ethereum");
    expect(getChainLabel(137)).toBe("Polygon");
    expect(getChainLabel(13370)).toBe("GYDS");
    expect(getChainLabel(42161)).toBe("Arbitrum");
    expect(getChainLabel(undefined)).toBe("GYDS");
    expect(getChainLabel(9999)).toBe("Chain 9999");
  });
});
