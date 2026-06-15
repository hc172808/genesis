import { useState, useEffect, useCallback, useRef } from "react";
import { getActiveConfig } from "@/lib/blockchain/config";
import { rpcCall } from "@/lib/blockchain/rpcClient";
import { gydsLitenode } from "@/lib/gydsLitenode";
import { toast } from "sonner";

export interface BlockUpdate {
  blockNumber: string;
  timestamp: number;
}

export interface TxNotification {
  hash: string;
  status: "confirmed" | "pending" | "failed";
  blockNumber?: string;
}

interface UseGydsWebSocketOptions {
  /** Wallet address to watch for incoming txs */
  watchAddress?: string | null;
  /** Transaction hashes to monitor for confirmation */
  pendingTxHashes?: string[];
  /** Enable price polling from indexer */
  enablePriceUpdates?: boolean;
  /** Poll interval in ms (default 10s) */
  pollInterval?: number;
}

/**
 * Real-time updates hook using GydsChain RPC node polling.
 * Uses eth_getBlockByNumber and eth_getTransactionReceipt for confirmations.
 * Falls back to polling since GydsChain nodes expose JSON-RPC over HTTP.
 */
export const useGydsWebSocket = (options: UseGydsWebSocketOptions = {}) => {
  const {
    watchAddress,
    pendingTxHashes = [],
    enablePriceUpdates = false,
    pollInterval = 10_000,
  } = options;

  const [latestBlock, setLatestBlock] = useState<BlockUpdate | null>(null);
  const [confirmedTxs, setConfirmedTxs] = useState<TxNotification[]>([]);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);

  const pendingRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep pendingRef in sync
  useEffect(() => {
    pendingTxHashes.forEach((h) => pendingRef.current.add(h));
  }, [pendingTxHashes]);

  /** Poll latest block from RPC node */
  const pollBlock = useCallback(async () => {
    try {
      const blockNumHex = await rpcCall<string>({ method: "eth_blockNumber" });
      const block: BlockUpdate = {
        blockNumber: blockNumHex,
        timestamp: Date.now(),
      };
      setLatestBlock(block);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, []);

  /** Check pending tx receipts */
  const checkPendingTxs = useCallback(async () => {
    const hashes = Array.from(pendingRef.current);
    if (hashes.length === 0) return;

    for (const hash of hashes) {
      try {
        const receipt = await rpcCall<{
          status: string;
          blockNumber: string;
        } | null>({
          method: "eth_getTransactionReceipt",
          params: [hash],
        });

        if (receipt) {
          const status = receipt.status === "0x1" ? "confirmed" : "failed";
          const notification: TxNotification = {
            hash,
            status,
            blockNumber: receipt.blockNumber,
          };

          setConfirmedTxs((prev) => {
            if (prev.some((t) => t.hash === hash)) return prev;
            return [...prev, notification];
          });

          pendingRef.current.delete(hash);

          // Show toast notification
          if (status === "confirmed") {
            toast.success(`Transaction confirmed! ${hash.slice(0, 12)}...`, {
              description: `Block: ${parseInt(receipt.blockNumber, 16)}`,
            });
          } else {
            toast.error(`Transaction failed: ${hash.slice(0, 12)}...`);
          }
        }
      } catch {
        // Receipt not yet available — still pending
      }
    }
  }, []);

  /** Fetch token prices from indexer */
  const fetchPrices = useCallback(async () => {
    if (!enablePriceUpdates) return;
    const config = getActiveConfig();
    try {
      const res = await fetch(`${config.indexerUrl}/api/prices`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          setTokenPrices(data as Record<string, number>);
        }
      }
    } catch {
      // Indexer may not expose /api/prices — silently ignore
    }
  }, [enablePriceUpdates]);

  // Main polling loop
  useEffect(() => {
    pollBlock(); // Initial fetch

    intervalRef.current = setInterval(() => {
      pollBlock();
      checkPendingTxs();
    }, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollBlock, checkPendingTxs, pollInterval]);

  // Price polling (separate interval, slower)
  useEffect(() => {
    if (!enablePriceUpdates) return;

    fetchPrices();
    priceIntervalRef.current = setInterval(fetchPrices, 30_000);

    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [enablePriceUpdates, fetchPrices]);

  /** Add a tx hash to watch for confirmation */
  const watchTransaction = useCallback((hash: string) => {
    pendingRef.current.add(hash);
    toast.info(`Watching transaction: ${hash.slice(0, 12)}...`);
  }, []);

  /** Clear confirmed tx notifications */
  const clearNotifications = useCallback(() => {
    setConfirmedTxs([]);
  }, []);

  return {
    latestBlock,
    confirmedTxs,
    tokenPrices,
    isConnected,
    watchTransaction,
    clearNotifications,
  };
};

