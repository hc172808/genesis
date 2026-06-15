import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Wifi } from "lucide-react";
import { SUPPORTED_CHAINS, type ChainConfig } from "@/lib/chain-adapter";
import { getActiveChainId, setActiveChainId } from "@/lib/chain-context";

const CHAIN_COLORS: Record<string, string> = {
  gyds: "from-[hsl(160,84%,50%)] to-[hsl(180,70%,50%)]",
  ethereum: "from-[hsl(230,60%,55%)] to-[hsl(260,50%,60%)]",
  polygon: "from-[hsl(270,70%,55%)] to-[hsl(290,60%,50%)]",
  solana: "from-[hsl(280,80%,55%)] to-[hsl(200,90%,50%)]",
};

const CHAIN_ICONS: Record<string, string> = {
  gyds: "G",
  ethereum: "Ξ",
  polygon: "P",
  solana: "◎",
};

interface ChainSelectorProps {
  onChainChange?: (chainId: string) => void;
}

const ChainSelector = ({ onChainChange }: ChainSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(getActiveChainId());
  const ref = useRef<HTMLDivElement>(null);

  const activeChain = SUPPORTED_CHAINS.find((c) => c.id === activeId) || SUPPORTED_CHAINS[0];

  const availableChains = SUPPORTED_CHAINS;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectChain = (chain: ChainConfig) => {
    setActiveId(chain.id);
    setActiveChainId(chain.id);
    setOpen(false);
    onChainChange?.(chain.id);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-card hover:bg-secondary/60 transition-colors rounded-xl px-3 py-2"
      >
        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${CHAIN_COLORS[activeChain.id] || CHAIN_COLORS.gyds} flex items-center justify-center`}>
          <span className="text-[10px] font-bold text-primary-foreground">{CHAIN_ICONS[activeChain.id] || "?"}</span>
        </div>
        <span className="text-xs font-semibold text-foreground hidden sm:inline">{activeChain.name}</span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">Select Network</p>
            </div>
            <div className="p-1">
              {availableChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => selectChain(chain)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    chain.id === activeId ? "bg-primary/10" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${CHAIN_COLORS[chain.id] || CHAIN_COLORS.gyds} flex items-center justify-center`}>
                    <span className="text-xs font-bold text-primary-foreground">{CHAIN_ICONS[chain.id] || "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{chain.name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Wifi size={8} /> {chain.symbol} · Chain {chain.chainId}
                    </p>
                  </div>
                  {chain.id === activeId && (
                    <Check size={16} className="text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChainSelector;
