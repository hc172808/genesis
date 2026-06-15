import { useState, useEffect, useCallback, useRef } from "react";
import { getActiveRpcUrl } from "@/lib/blockchain/rpcClient";
import { gydsLitenode, type NodeInfo, type ValidatorSet } from "@/lib/gydsLitenode";

export type NetworkHealth = "connected" | "degraded" | "offline";

interface NetworkStatus {
  health:          NetworkHealth;
  activeEndpoint:  string;
  latencyMs:       number | null;
  blockNumber:     number | null;
  lastChecked:     number;
  nodeInfo:        NodeInfo | null;
  validatorCount:  number | null;
}

const HEALTH_POLL_MS = 10_000;

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    health:         "offline",
    activeEndpoint: getActiveRpcUrl(),
    latencyMs:      null,
    blockNumber:    null,
    lastChecked:    0,
    nodeInfo:       null,
    validatorCount: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async () => {
    const start = Date.now();
    try {
      const blockNumber = await gydsLitenode.getBlockNumber();
      const latency     = Date.now() - start;

      let nodeInfo:       NodeInfo | null = null;
      let validatorCount: number | null   = null;
      try {
        const [info, vs]: [NodeInfo, ValidatorSet] = await Promise.all([
          gydsLitenode.getNodeInfo(),
          gydsLitenode.getValidatorSet(),
        ]);
        nodeInfo       = info;
        validatorCount = vs.validators.length;
      } catch { /* node may not yet expose GYDS custom methods */ }

      setStatus({
        health:         latency < 3000 ? "connected" : "degraded",
        activeEndpoint: getActiveRpcUrl(),
        latencyMs:      latency,
        blockNumber,
        lastChecked:    Date.now(),
        nodeInfo,
        validatorCount,
      });
    } catch {
      setStatus((prev) => ({
        ...prev,
        health:         "offline",
        activeEndpoint: getActiveRpcUrl(),
        latencyMs:      null,
        lastChecked:    Date.now(),
      }));
    }
  }, []);

  useEffect(() => {
    checkHealth();
    pollRef.current = setInterval(checkHealth, HEALTH_POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkHealth]);

  return { ...status, refresh: checkHealth };
};
