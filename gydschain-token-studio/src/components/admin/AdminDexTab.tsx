import { useState } from "react";
import { Rocket, CheckCircle2, AlertTriangle, Copy, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { activeConfig, getExplorerUrl } from "@/lib/blockchain/config";
import {
  getDexAddresses,
  saveDexAddresses,
  clearDexAddresses,
  type DexAddresses,
} from "@/lib/blockchain/dexConfig";
import { useWallet } from "@/hooks/useWallet";
import { sendTransaction } from "@/lib/blockchain/walletAdapter";

interface AdminDexTabProps {
  wallet: { address: string | null; isConnected: boolean };
}

const AdminDexTab = ({ wallet }: AdminDexTabProps) => {
  const { getRawProvider, getFullAddress } = useWallet();
  const [existing, setExisting] = useState<DexAddresses | null>(getDexAddresses());
  const [isDeploying, setIsDeploying] = useState(false);
  const [manualMode, setManualMode] = useState(!!existing);

  // Manual entry form
  const [factory, setFactory] = useState(existing?.factory ?? "");
  const [router, setRouter] = useState(existing?.router ?? "");
  const [wgyds, setWgyds] = useState(existing?.wgyds ?? "");
  const [v4, setV4] = useState(existing?.v4PoolManager ?? "");

  const isValidAddr = (a: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(a);

  const handleSaveManual = () => {
    if (!isValidAddr(factory) || !isValidAddr(router) || !isValidAddr(wgyds)) {
      toast.error("Factory, Router and WGYDS must all be valid 0x… addresses");
      return;
    }
    if (v4 && !isValidAddr(v4)) {
      toast.error("V4 PoolManager address is invalid");
      return;
    }
    const addresses: DexAddresses = {
      factory,
      router,
      wgyds,
      v4PoolManager: v4 || undefined,
      deployedAt: new Date().toISOString(),
      deployerAddress: wallet.address || "manual",
    };
    saveDexAddresses(addresses);
    setExisting(addresses);
    toast.success("DEX addresses saved for " + activeConfig.networkName);
  };

  const handleDeployStub = async () => {
    const provider = getRawProvider();
    const from = getFullAddress();
    if (!provider || !from) {
      toast.error("Connect your admin wallet first");
      return;
    }
    setIsDeploying(true);
    try {
      // We don't ship full Uniswap V2 bytecode here (would be 50KB+ unaudited).
      // This deploys a tiny marker contract so the admin can verify the wallet
      // can sign + the network accepts deploys, then prompt them to either:
      //   1) Run their own factory/router deployment script and paste addresses, OR
      //   2) Use the manual entry below.
      // PUSH1 0x00 PUSH1 0x00 RETURN — empty contract, just for connectivity test
      const stubBytecode = "0x6000600052602060005260206000F3";
      const txHash = await sendTransaction(provider, {
        from,
        to: "",
        data: stubBytecode,
      });
      toast.success("Connectivity test deployed. Now use Manual Entry below to register your real router/factory addresses.", {
        description: `tx: ${txHash.slice(0, 14)}…`,
        duration: 8000,
      });
      setManualMode(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deployment failed";
      toast.error(msg);
    }
    setIsDeploying(false);
  };

  const handleClear = () => {
    clearDexAddresses();
    setExisting(null);
    setFactory("");
    setRouter("");
    setWgyds("");
    setV4("");
    toast.success("DEX configuration cleared");
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copied");
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" /> DEX Deployment
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Configure the Factory + Router + WGYDS contract addresses powering CPMM and AMM v4 pools on{" "}
              <span className="text-foreground">{activeConfig.networkName}</span>.
            </p>
          </div>
          {existing ? (
            <span className="px-2 py-1 rounded-full text-xs bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full text-xs bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Not configured
            </span>
          )}
        </div>

        {existing && (
          <div className="space-y-2 mb-4 bg-muted/20 rounded-lg p-3">
            {[
              { label: "Factory", value: existing.factory },
              { label: "Router", value: existing.router },
              { label: "WGYDS", value: existing.wgyds },
              ...(existing.v4PoolManager
                ? [{ label: "V4 PoolManager", value: existing.v4PoolManager }]
                : []),
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground w-32 shrink-0">{row.label}</span>
                <code className="font-mono truncate flex-1">{row.value}</code>
                <button onClick={() => copy(row.value)} className="text-muted-foreground hover:text-foreground">
                  <Copy className="w-3 h-3" />
                </button>
                <a
                  href={getExplorerUrl("address", row.value)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1">
              Deployed by {existing.deployerAddress.slice(0, 10)}… on{" "}
              {new Date(existing.deployedAt).toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!existing && (
            <Button
              size="sm"
              onClick={handleDeployStub}
              disabled={isDeploying || !wallet.isConnected}
              variant="outline"
              className="border-primary/30"
            >
              {isDeploying ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5 mr-1" />
              )}
              Test wallet → chain
            </Button>
          )}
          <Button
            size="sm"
            variant={manualMode ? "default" : "outline"}
            onClick={() => setManualMode(!manualMode)}
          >
            {existing ? "Edit Addresses" : "Enter Addresses"}
          </Button>
          {existing && (
            <Button size="sm" variant="ghost" onClick={handleClear} className="text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {manualMode && (
        <div className="glass-card p-5 space-y-4">
          <div>
            <h4 className="font-heading font-semibold mb-1">Register DEX Contracts</h4>
            <p className="text-xs text-muted-foreground">
              Paste the addresses of your deployed Uniswap V2-compatible factory + router and the
              WGYDS (wrapped native) contract. These are the same contracts that any V2-style DEX
              uses (PancakeSwap, SushiSwap fork, etc.). The router will be granted token allowances
              by users on demand.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs">Factory Address</Label>
              <Input
                value={factory}
                onChange={(e) => setFactory(e.target.value.trim())}
                placeholder="0x…"
                className="mt-1 font-mono text-sm bg-muted/40"
              />
            </div>
            <div>
              <Label className="text-xs">Router Address</Label>
              <Input
                value={router}
                onChange={(e) => setRouter(e.target.value.trim())}
                placeholder="0x…"
                className="mt-1 font-mono text-sm bg-muted/40"
              />
            </div>
            <div>
              <Label className="text-xs">WGYDS (Wrapped Native) Address</Label>
              <Input
                value={wgyds}
                onChange={(e) => setWgyds(e.target.value.trim())}
                placeholder="0x…"
                className="mt-1 font-mono text-sm bg-muted/40"
              />
            </div>
            <div>
              <Label className="text-xs">
                AMM v4 PoolManager <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                value={v4}
                onChange={(e) => setV4(e.target.value.trim())}
                placeholder="0x… (leave empty to disable v4 pools)"
                className="mt-1 font-mono text-sm bg-muted/40"
              />
            </div>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="text-primary font-medium mb-1">Fee split: 84% LPs / 16% Protocol</p>
            <p>
              The router contract enforces the fee split on-chain — make sure you deployed it with{" "}
              <code className="text-foreground">feeBps=25</code> per swap and{" "}
              <code className="text-foreground">protocolBps=1600</code> of the LP fee redirected to
              the platform treasury.
            </p>
          </div>
          <Button onClick={handleSaveManual} className="btn-gradient w-full">
            Save DEX Configuration
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminDexTab;
