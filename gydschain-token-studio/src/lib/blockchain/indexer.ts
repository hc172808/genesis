import { rpcCall } from "./rpcClient";
import { activeConfig } from "./config";
import type { DeployedToken, Transaction } from "./types";

/**
 * Chain Indexer — reads on-chain data from the GydsChain RPC/indexer.
 * Falls back to mock data when RPC is unreachable.
 */

// ─── Token Registry ──────────────────────────────────────────

/** Fetch token data by contract address */
export const getTokenInfo = async (contractAddress: string) => {
  try {
    // ERC-20 name() selector: 0x06fdde03
    const [nameHex, symbolHex, decimalsHex, supplyHex] = await Promise.all([
      rpcCall<string>({ method: "eth_call", params: [{ to: contractAddress, data: "0x06fdde03" }, "latest"] }),
      rpcCall<string>({ method: "eth_call", params: [{ to: contractAddress, data: "0x95d89b41" }, "latest"] }),
      rpcCall<string>({ method: "eth_call", params: [{ to: contractAddress, data: "0x313ce567" }, "latest"] }),
      rpcCall<string>({ method: "eth_call", params: [{ to: contractAddress, data: "0x18160ddd" }, "latest"] }),
    ]);

    return {
      contractAddress,
      name: decodeString(nameHex),
      symbol: decodeString(symbolHex),
      decimals: parseInt(decimalsHex, 16),
      totalSupply: BigInt(supplyHex).toString(),
    };
  } catch (err) {
    console.warn("[Indexer] Failed to fetch token info:", err);
    return null;
  }
};

/** Get token balance for a holder */
export const getTokenBalance = async (tokenAddress: string, holderAddress: string) => {
  try {
    // balanceOf(address) selector: 0x70a08231 + padded address
    const paddedAddr = holderAddress.replace("0x", "").padStart(64, "0");
    const result = await rpcCall<string>({
      method: "eth_call",
      params: [{ to: tokenAddress, data: `0x70a08231${paddedAddr}` }, "latest"],
    });
    return BigInt(result).toString();
  } catch (err) {
    console.warn("[Indexer] Failed to fetch token balance:", err);
    return "0";
  }
};

// ─── Transaction History ─────────────────────────────────────

/** Get transaction receipt */
export const getTransactionReceipt = async (txHash: string) => {
  try {
    const receipt = await rpcCall<{
      status: string;
      blockNumber: string;
      gasUsed: string;
      logs: Array<{ address: string; topics: string[]; data: string }>;
    }>({ method: "eth_getTransactionReceipt", params: [txHash] });

    return {
      success: receipt.status === "0x1",
      blockNumber: parseInt(receipt.blockNumber, 16),
      gasUsed: BigInt(receipt.gasUsed).toString(),
      logs: receipt.logs,
    };
  } catch (err) {
    console.warn("[Indexer] Failed to fetch tx receipt:", err);
    return null;
  }
};

/** Get recent blocks for transaction scanning */
export const getRecentTransactions = async (address: string, blockCount = 100) => {
  try {
    const latestHex = await rpcCall<string>({ method: "eth_blockNumber" });
    const latest = parseInt(latestHex, 16);
    const fromBlock = Math.max(0, latest - blockCount);

    // Use eth_getLogs to find events involving this address
    const logs = await rpcCall<Array<{
      address: string;
      topics: string[];
      data: string;
      transactionHash: string;
      blockNumber: string;
    }>>({
      method: "eth_getLogs",
      params: [{
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: "latest",
        topics: [null, `0x000000000000000000000000${address.replace("0x", "")}`],
      }],
    });

    return logs.map((log) => ({
      hash: log.transactionHash,
      contractAddress: log.address,
      blockNumber: parseInt(log.blockNumber, 16),
      data: log.data,
      topics: log.topics,
    }));
  } catch (err) {
    console.warn("[Indexer] Failed to fetch recent transactions:", err);
    return [];
  }
};

// ─── Liquidity Pool Data ─────────────────────────────────────

export interface PoolInfo {
  pairAddress: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
}

/** Read pool reserves from a pair contract */
export const getPoolInfo = async (pairAddress: string): Promise<PoolInfo | null> => {
  try {
    const [reservesHex, token0Hex, token1Hex, supplyHex] = await Promise.all([
      // getReserves() selector: 0x0902f1ac
      rpcCall<string>({ method: "eth_call", params: [{ to: pairAddress, data: "0x0902f1ac" }, "latest"] }),
      // token0() selector: 0x0dfe1681
      rpcCall<string>({ method: "eth_call", params: [{ to: pairAddress, data: "0x0dfe1681" }, "latest"] }),
      // token1() selector: 0xd21220a7
      rpcCall<string>({ method: "eth_call", params: [{ to: pairAddress, data: "0xd21220a7" }, "latest"] }),
      // totalSupply() selector: 0x18160ddd
      rpcCall<string>({ method: "eth_call", params: [{ to: pairAddress, data: "0x18160ddd" }, "latest"] }),
    ]);

    // Reserves are packed: uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast
    const reserveData = reservesHex.replace("0x", "");
    const reserve0 = BigInt("0x" + reserveData.slice(0, 64)).toString();
    const reserve1 = BigInt("0x" + reserveData.slice(64, 128)).toString();

    return {
      pairAddress,
      token0: "0x" + token0Hex.slice(-40),
      token1: "0x" + token1Hex.slice(-40),
      reserve0,
      reserve1,
      totalSupply: BigInt(supplyHex).toString(),
    };
  } catch (err) {
    console.warn("[Indexer] Failed to fetch pool info:", err);
    return null;
  }
};

/** Calculate swap output using constant product formula (CPMM) */
export const calculateSwapOutput = (
  amountIn: string,
  reserveIn: string,
  reserveOut: string,
  feePercent = 0.25
): string => {
  const input = BigInt(amountIn);
  const rIn = BigInt(reserveIn);
  const rOut = BigInt(reserveOut);
  const feeMultiplier = BigInt(Math.floor((100 - feePercent) * 100));

  const amountInWithFee = input * feeMultiplier;
  const numerator = amountInWithFee * rOut;
  const denominator = rIn * BigInt(10000) + amountInWithFee;

  return (numerator / denominator).toString();
};

/** Calculate price impact for a swap */
export const calculatePriceImpact = (
  amountIn: string,
  reserveIn: string,
  reserveOut: string
): number => {
  const input = Number(amountIn);
  const rIn = Number(reserveIn);
  const rOut = Number(reserveOut);

  const spotPrice = rOut / rIn;
  const outputAmount = Number(calculateSwapOutput(amountIn, reserveIn, reserveOut));
  const executionPrice = outputAmount / input;

  return Math.abs((spotPrice - executionPrice) / spotPrice) * 100;
};

// ─── Block Info ──────────────────────────────────────────────

export const getBlockInfo = async (blockNumber?: number) => {
  try {
    const blockParam = blockNumber ? `0x${blockNumber.toString(16)}` : "latest";
    const block = await rpcCall<{
      number: string;
      timestamp: string;
      transactions: string[];
      gasUsed: string;
      gasLimit: string;
    }>({ method: "eth_getBlockByNumber", params: [blockParam, false] });

    return {
      number: parseInt(block.number, 16),
      timestamp: parseInt(block.timestamp, 16),
      txCount: block.transactions.length,
      gasUsed: BigInt(block.gasUsed).toString(),
      gasLimit: BigInt(block.gasLimit).toString(),
    };
  } catch (err) {
    console.warn("[Indexer] Failed to fetch block info:", err);
    return null;
  }
};

// ─── Helpers ─────────────────────────────────────────────────

/** Decode ABI-encoded string from eth_call result */
const decodeString = (hex: string): string => {
  try {
    const data = hex.replace("0x", "");
    // Skip offset (32 bytes) and read length (32 bytes)
    const length = parseInt(data.slice(64, 128), 16);
    const strHex = data.slice(128, 128 + length * 2);
    return strHex
      .match(/.{1,2}/g)
      ?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
      .join("")
      .replace(/\0/g, "") ?? "";
  } catch {
    return "";
  }
};
