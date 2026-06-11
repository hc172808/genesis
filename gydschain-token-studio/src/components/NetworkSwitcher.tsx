import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Globe } from "lucide-react";
import { getCurrentConfig, switchNetwork, onNetworkChange } from "@/lib/blockchain/networkManager";
import type { ChainConfig } from "@/lib/blockchain/config";

const networks = [
  { id: "devnet" as const, label: "Devnet", color: "bg-yellow-500" },
  { id: "mainnet" as const, label: "Mainnet", color: "bg-[hsl(var(--success))]" },
];

export const NetworkSwitcher = () => {
  const [config, setConfig] = useState<ChainConfig>(getCurrentConfig);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return onNetworkChange(setConfig);
  }, []);

  const currentNetwork = config.networkName.toLowerCase().includes("mainnet") ? "mainnet" : "devnet";
  const current = networks.find((n) => n.id === currentNetwork)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors text-xs"
      >
        <span className={`w-2 h-2 rounded-full ${current.color}`} />
        <Globe className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-full right-0 mt-1 w-40 glass-card-strong border border-border/50 rounded-xl p-1.5 z-50"
          >
            {networks.map((net) => (
              <button
                key={net.id}
                onClick={() => { switchNetwork(net.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  net.id === currentNetwork
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${net.color}`} />
                {net.label}
                {net.id === currentNetwork && <span className="ml-auto text-[10px]">Active</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
