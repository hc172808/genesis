import { getActiveRpc } from "./network-config";

export interface FeeEstimate {
  gasPrice: string;       // Gwei, for display
  gasLimit: number;
  totalFeeEth: string;    // in native token
  totalFeeUsd: string;
  tiers: {
    slow:     { gwei: string; totalEth: string; totalUsd: string };
    standard: { gwei: string; totalEth: string; totalUsd: string };
    fast:     { gwei: string; totalEth: string; totalUsd: string };
  };
  eip1559: boolean;
}

// Fallback gas limits when eth_estimateGas fails or is unavailable
const NATIVE_GAS_LIMIT   = 21_000;
const ERC20_GAS_LIMIT    = 65_000;
const CONTRACT_GAS_LIMIT = 120_000;

const fmt = (wei: number, usdPrice?: number) => {
  const eth = wei / 1e18;
  const ethStr = eth < 0.000001 ? eth.toExponential(2) : eth.toFixed(6);
  const usdStr = usdPrice ? `$${(eth * usdPrice).toFixed(4)}` : "—";
  return { totalEth: ethStr, totalUsd: usdStr };
};

const fmtGwei = (wei: number) => {
  const g = wei / 1e9;
  return g < 0.01 ? g.toExponential(2) : g.toFixed(2);
};

export const estimateGasFee = async (
  from: string,
  to: string,
  value: string,
  data?: string,
  nativeUsdPrice?: number
): Promise<FeeEstimate | null> => {
  const rpc = await getActiveRpc();
  if (!rpc) return null;

  try {
    const post = (body: object) =>
      fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());

    // ── Gas price: prefer EIP-1559 fee history ──────────────
    let baseGasWei = 0;
    let priorityWei = 1_000_000_000; // 1 Gwei default tip
    let eip1559 = false;

    try {
      const feeHistRes = await post({
        jsonrpc: "2.0", method: "eth_feeHistory",
        params: ["0x5", "latest", [10, 50, 90]], id: 10,
      });
      const reward = feeHistRes?.result?.reward;
      const baseFees: string[] = feeHistRes?.result?.baseFeePerGas ?? [];
      if (baseFees.length > 0) {
        eip1559 = true;
        const latestBase = parseInt(baseFees[baseFees.length - 1] ?? "0x0", 16);
        const p10 = reward?.map((r: string[]) => parseInt(r[0], 16)) ?? [];
        const p50 = reward?.map((r: string[]) => parseInt(r[1], 16)) ?? [];
        const p90 = reward?.map((r: string[]) => parseInt(r[2], 16)) ?? [];
        const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        baseGasWei   = latestBase;
        priorityWei  = avg(p50) || 1_000_000_000;
        const slowTip   = avg(p10) || priorityWei * 0.8;
        const fastTip   = avg(p90) || priorityWei * 1.5;
        baseGasWei   = latestBase; // keep for tiers below
        // store tiers on object — resolved later
        (estimateGasFee as any)._tiers = {
          slow:     Math.floor(latestBase + slowTip),
          standard: Math.floor(latestBase + priorityWei),
          fast:     Math.floor(latestBase * 1.1 + fastTip),
        };
      }
    } catch { /* fall through */ }

    if (!eip1559) {
      const gpRes = await post({ jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 1 });
      const gpWei = parseInt(gpRes?.result ?? "0x0", 16);
      baseGasWei  = gpWei;
      priorityWei = 0;
      (estimateGasFee as any)._tiers = {
        slow:     Math.floor(gpWei * 0.85),
        standard: gpWei,
        fast:     Math.floor(gpWei * 1.25),
      };
    }

    const gasPriceWei: number = (estimateGasFee as any)._tiers?.standard ?? baseGasWei;

    // ── Gas limit: prefer eth_estimateGas ──────────────────
    const estimateBody: Record<string, string> = { from, to };
    if (value && value !== "0") {
      try {
        estimateBody.value = "0x" + BigInt(Math.floor(parseFloat(value) * 1e18)).toString(16);
      } catch { /* skip */ }
    }
    if (data) estimateBody.data = data;

    const gasEstRes = await post({ jsonrpc: "2.0", method: "eth_estimateGas", params: [estimateBody], id: 2 });
    let gasLimit: number;
    if (gasEstRes?.result) {
      // Add 20% buffer to the estimate
      gasLimit = Math.ceil(parseInt(gasEstRes.result, 16) * 1.2);
    } else if (data && data !== "0x") {
      gasLimit = data.length > 10 ? CONTRACT_GAS_LIMIT : ERC20_GAS_LIMIT;
    } else {
      gasLimit = NATIVE_GAS_LIMIT;
    }

    const tiers = (estimateGasFee as any)._tiers;
    const makeT = (gwei: number) => {
      const { totalEth, totalUsd } = fmt(gwei * gasLimit, nativeUsdPrice);
      return { gwei: fmtGwei(gwei), totalEth, totalUsd };
    };

    return {
      gasPrice: fmtGwei(gasPriceWei),
      gasLimit,
      totalFeeEth: fmt(gasPriceWei * gasLimit, nativeUsdPrice).totalEth,
      totalFeeUsd: fmt(gasPriceWei * gasLimit, nativeUsdPrice).totalUsd,
      tiers: {
        slow:     makeT(tiers.slow),
        standard: makeT(tiers.standard),
        fast:     makeT(tiers.fast),
      },
      eip1559,
    };
  } catch {
    return null;
  }
};
