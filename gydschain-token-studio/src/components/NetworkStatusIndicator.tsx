import { motion } from "framer-motion";
import { Wifi, WifiOff, Activity } from "lucide-react";
import { useNetworkStatus, type NetworkHealth } from "@/hooks/useNetworkStatus";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const statusConfig: Record<NetworkHealth, { color: string; icon: typeof Wifi; label: string }> = {
  connected: { color: "bg-[hsl(var(--success))]", icon: Wifi, label: "Connected" },
  degraded: { color: "bg-yellow-500", icon: Activity, label: "Degraded" },
  offline: { color: "bg-destructive", icon: WifiOff, label: "Offline" },
};

export const NetworkStatusIndicator = () => {
  const { health, activeEndpoint, latencyMs, blockNumber } = useNetworkStatus();
  const config = statusConfig[health];
  const Icon = config.icon;

  const shortEndpoint = (() => {
    try {
      return new URL(activeEndpoint).hostname;
    } catch {
      return activeEndpoint;
    }
  })();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors text-xs"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className={`w-2 h-2 rounded-full ${config.color} ${health === "connected" ? "animate-pulse" : ""}`} />
          <Icon className="w-3 h-3 text-muted-foreground" />
          <span className="hidden xl:inline text-muted-foreground">{shortEndpoint}</span>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs space-y-1">
        <p className="font-semibold">Network: {config.label}</p>
        <p>RPC: {shortEndpoint}</p>
        {latencyMs !== null && <p>Latency: {latencyMs}ms</p>}
        {blockNumber !== null && <p>Block: #{blockNumber.toLocaleString()}</p>}
      </TooltipContent>
    </Tooltip>
  );
};
