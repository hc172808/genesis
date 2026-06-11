import { test, expect } from "@playwright/test";

const WALLET = "0x6422D12BFADdEE5142BFaD21b3006a74D09017B1";

const TOKENS = [
  { contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin",  decimals: 6,  color: "from-sky-400 to-blue-500",      chainId: 1     },
  { contractAddress: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped ETH", decimals: 18, color: "from-violet-400 to-purple-500", chainId: 137   },
  { contractAddress: "0x0000000000000000000000000000000000001010", symbol: "GYDX", name: "GYDS Token",  decimals: 18, color: "from-amber-400 to-yellow-500",  chainId: 13370 },
];

test.describe("Imported tokens render the correct chain badge", () => {
  test("Ethereum (1), Polygon (137) and GYDS (13370) badges are visible", async ({ page }) => {
    await page.addInitScript(([wallet, tokens]) => {
      localStorage.setItem("gyds_wallet_address", wallet as string);
      localStorage.setItem("gyds_custom_tokens", JSON.stringify(tokens));
    }, [WALLET, TOKENS]);

    await page.goto("/");
    await expect(page.getByText("USDC")).toBeVisible();
    await expect(page.getByText("Ethereum")).toBeVisible();
    await expect(page.getByText("Polygon")).toBeVisible();
    await expect(page.getByText("GYDS")).toBeVisible();
  });
});
