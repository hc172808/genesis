import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchAllTokenBalances,
  __setRpcForChain,
  __clearRpcCache,
} from "@/lib/balance-fetcher";

// Stub the active GYDS rpc so accidental fallbacks are detectable.
vi.mock("@/lib/network-config", () => ({
  getActiveRpc: async () => "https://rpc.netlifegy.com",
}));

describe("balance-fetcher per-chain RPC routing", () => {
  beforeEach(() => {
    __clearRpcCache();
    localStorage.clear();
    __setRpcForChain(1, "https://eth.llamarpc.com");
    __setRpcForChain(137, "https://polygon-rpc.com");
  });

  it("routes ERC-20 balanceOf calls to the RPC matching each token's chainId", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({ result: "0x0de0b6b3a7640000" }), // 1.0
      } as any;
    });
    vi.stubGlobal("fetch", fetchMock);

    const tokens = [
      { contractAddress: "0xAAA", decimals: 18, symbol: "ETHTOK", chainId: 1 },
      { contractAddress: "0xBBB", decimals: 18, symbol: "POLYTOK", chainId: 137 },
      { contractAddress: "0xCCC", decimals: 18, symbol: "GYDSTOK" }, // no chainId → active
    ];

    const balances = await fetchAllTokenBalances(tokens, "0x1111111111111111111111111111111111111111");

    expect(balances.ETHTOK).toBe("1");
    expect(balances.POLYTOK).toBe("1");
    expect(balances.GYDSTOK).toBe("1");

    expect(calls).toContain("https://eth.llamarpc.com");
    expect(calls).toContain("https://polygon-rpc.com");
    expect(calls).toContain("https://rpc.netlifegy.com");
    // Polygon token must NOT have been queried via Ethereum RPC.
    const polyTokenCalls = fetchMock.mock.calls.filter(([, init]: any) =>
      String(init?.body || "").toLowerCase().includes("0xbbb")
    );
    polyTokenCalls.forEach(([url]: any) => {
      expect(url).toBe("https://polygon-rpc.com");
    });

    vi.unstubAllGlobals();
  });
});
