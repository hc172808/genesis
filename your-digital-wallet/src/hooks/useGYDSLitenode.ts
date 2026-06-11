/**
 * useGYDSLitenode
 *
 * React hook that exposes the shared GYDSLitenode instance for components.
 * Provides live block number, node health, and validator set — all via
 * the litenode's WebSocket subscription with HTTP polling fallback.
 *
 * Usage:
 *   const { blockNumber, isAlive, validatorCount, litenode } = useGYDSLitenode();
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  gydsLitenode,
  GYDS_CHAIN_ID,
  GYDS_CHAIN_ID_HEX,
  GYDS_RPC_PRIMARY,
  GYDS_EXPLORER_URL,
  type BlockHeader,
  type NodeInfo,
  type ValidatorSet,
} from "@/lib/gydsLitenode";

export type ChainHealth = "connected" | "degraded" | "offline";

export interface GYDSLitenodeState {
  blockNumber:    number | null;
  latestHeader:   BlockHeader | null;
  latencyMs:      number | null;
  health:         ChainHealth;
  nodeInfo:       NodeInfo | null;
  validatorCount: number | null;
  cachedHeaders:  number;
  lastChecked:    number;
}

interface UseGYDSLitenodeOptions {
  /** Poll interval in ms when WebSocket is not available (default 10s) */
  pollIntervalMs?: number;
  /** Whether to fetch nodeInfo + validatorSet on each poll (default true) */
  fetchNodeInfo?: boolean;
}

export const useGYDSLitenode = (opts: UseGYDSLitenodeOptions = {}) => {
  const { pollIntervalMs = 10_000, fetchNodeInfo = true } = opts;

  const [state, setState] = useState<GYDSLitenodeState>({
    blockNumber:    null,
    latestHeader:   null,
    latencyMs:      null,
    health:         "offline",
    nodeInfo:       null,
    validatorCount: null,
    cachedHeaders:  0,
    lastChecked:    0,
  });

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef   = useRef<(() => void) | null>(null);

  // Called whenever a new block arrives (WebSocket or poll)
  const handleBlock = useCallback((header: BlockHeader) => {
    setState(prev => ({
      ...prev,
      blockNumber:   header.number,
      latestHeader:  header,
      health:        "connected",
      cachedHeaders: gydsLitenode.getCachedBlockCount(),
      lastChecked:   Date.now(),
    }));
  }, []);

  // Full health-check poll (block + optional node info)
  const poll = useCallback(async () => {
    const start = Date.now();
    try {
      const blockNumber = await gydsLitenode.getBlockNumber();
      const latency     = Date.now() - start;
      const header      = gydsLitenode.getLatestCachedHeader() ?? null;

      let nodeInfo:       NodeInfo | null = null;
      let validatorCount: number | null   = null;

      if (fetchNodeInfo) {
        try {
          const [info, vs]: [NodeInfo, ValidatorSet] = await Promise.all([
            gydsLitenode.getNodeInfo(),
            gydsLitenode.getValidatorSet(),
          ]);
          nodeInfo       = info;
          validatorCount = vs.validators.length;
        } catch { /* GYDS custom methods may not be available yet */ }
      }

      setState(prev => ({
        ...prev,
        blockNumber,
        latestHeader:   header,
        latencyMs:      latency,
        health:         latency < 3000 ? "connected" : "degraded",
        nodeInfo,
        validatorCount,
        cachedHeaders:  gydsLitenode.getCachedBlockCount(),
        lastChecked:    Date.now(),
      }));
    } catch {
      setState(prev => ({
        ...prev,
        health:      "offline",
        latencyMs:   null,
        lastChecked: Date.now(),
      }));
    }
  }, [fetchNodeInfo]);

  useEffect(() => {
    // Initial poll
    poll();

    // Subscribe to new blocks via WebSocket (auto-reconnects internally)
    unsubRef.current = gydsLitenode.subscribeNewBlocks(handleBlock);

    // Keep a slower poll running for node info + health latency measurement
    pollRef.current = setInterval(poll, pollIntervalMs);

    return () => {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
      if (pollRef.current)  { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [poll, handleBlock, pollIntervalMs]);

  /** Force an immediate refresh */
  const refresh = useCallback(() => { poll(); }, [poll]);

  return {
    ...state,
    refresh,
    litenode:       gydsLitenode,
    chainId:        GYDS_CHAIN_ID,
    chainIdHex:     GYDS_CHAIN_ID_HEX,
    rpcUrl:         GYDS_RPC_PRIMARY,
    explorerUrl:    GYDS_EXPLORER_URL,
  };
};

export {
  gydsLitenode,
  GYDS_CHAIN_ID,
  GYDS_CHAIN_ID_HEX,
  GYDS_RPC_PRIMARY,
  GYDS_EXPLORER_URL,
};
