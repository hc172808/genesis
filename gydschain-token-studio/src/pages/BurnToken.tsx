import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Info, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletConfirmDialog } from "@/components/WalletConfirmDialog";
import { toast } from "sonner";
import type { DeployedToken } from "@/lib/blockchain/types";

interface BurnTokenPageProps {
  tokens: DeployedToken[];
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  onBurnTokens?: (tokenAddress: string, amount: string) => Promise<string>;
}

const BurnTokenPage = ({ tokens, isWalletConnected, onConnectWallet, onBurnTokens }: BurnTokenPageProps) => {
  const [burnType, setBurnType] = useState<"token" | "lp">("token");
  const [selectedToken, setSelectedToken] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [burnPercent, setBurnPercent] = useState([50]);
  const [lpAddress, setLpAddress] = useState("");
  const [isBurning, setIsBurning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRequestBurn = () => {
    if (!isWalletConnected) { onConnectWallet(); return; }
    if (burnType === "token") {
      if (!selectedToken) { toast.error("Select a token to burn"); return; }
      if (!burnAmount || Number(burnAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    } else {
      if (!lpAddress) { toast.error("Enter LP token address"); return; }
    }
    setShowConfirm(true);
  };

  const handleConfirmedBurn = async () => {
    setShowConfirm(false);
    setIsBurning(true);

    if (burnType === "token") {
      try {
        if (onBurnTokens) {
          const txHash = await onBurnTokens(selectedToken, burnAmount);
          toast.success(`Tokens burned! TX: ${txHash.slice(0, 10)}...`);
        } else {
          await new Promise((r) => setTimeout(r, 2500));
          toast.success("Tokens burned!");
        }
        setBurnAmount("");
      } catch (err) {
        console.error("[Burn] Error:", err);
        toast.error("Burn failed. Please try again.");
      }
    } else {
      await new Promise((r) => setTimeout(r, 2500));
      toast.success(`Burned ${burnPercent[0]}% LP tokens — liquidity locked!`);
      setLpAddress("");
    }
    setIsBurning(false);
  };

  const selectedTokenObj = tokens.find((t) => t.contractAddress === selectedToken);

  if (!isWalletConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Flame className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Connect a wallet to burn tokens.</p>
          <Button onClick={onConnectWallet} className="btn-gradient">Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-heading font-bold mb-2">
            Burn <span className="gradient-text">Token</span>
          </h1>
          <p className="text-muted-foreground mb-8">Permanently remove tokens or lock liquidity</p>

          <div className="glass-card p-6">
            <Tabs value={burnType} onValueChange={(v) => setBurnType(v as "token" | "lp")}>
              <TabsList className="w-full mb-6 bg-muted/30">
                <TabsTrigger value="token" className="flex-1">Burn Tokens</TabsTrigger>
                <TabsTrigger value="lp" className="flex-1">Burn LP (Lock Liquidity)</TabsTrigger>
              </TabsList>

              <TabsContent value="token" className="space-y-5">
                <div>
                  <Label>Select Token</Label>
                  <Select value={selectedToken} onValueChange={setSelectedToken}>
                    <SelectTrigger className="mt-1.5 bg-muted/50 border-border/50">
                      <SelectValue placeholder="Choose token to burn" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((t) => (
                        <SelectItem key={t.contractAddress} value={t.contractAddress}>{t.name} ({t.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Burn Amount</Label>
                  <Input value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} placeholder="Amount to burn" className="mt-1.5 bg-muted/50 border-border/50" type="number" />
                </div>
              </TabsContent>

              <TabsContent value="lp" className="space-y-5">
                <div>
                  <Label>LP Token / Pool Address</Label>
                  <Input value={lpAddress} onChange={(e) => setLpAddress(e.target.value)} placeholder="Enter LP token address" className="mt-1.5 bg-muted/50 border-border/50 font-mono text-sm" />
                </div>
                <div>
                  <Label>Amount to Burn</Label>
                  <div className="mt-3 bg-muted/30 rounded-xl p-4 text-center">
                    <span className="text-4xl font-heading font-bold gradient-text">{burnPercent[0]}%</span>
                  </div>
                  <Slider value={burnPercent} onValueChange={setBurnPercent} min={1} max={100} step={1} className="mt-3" />
                  <div className="flex justify-end gap-2 mt-2">
                    {[25, 50, 75, 100].map((p) => (
                      <button key={p} onClick={() => setBurnPercent([p])} className={`px-3 py-1 rounded-lg text-xs ${burnPercent[0] === p ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}>{p}%</button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Burning LP tokens locks liquidity permanently. This shows as "locked" on explorers.</p>
              </TabsContent>
            </Tabs>

            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive flex gap-2 mt-6">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Burning is irreversible. Tokens will be permanently destroyed.</span>
            </div>

            <Button onClick={handleRequestBurn} disabled={isBurning} className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isBurning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Burning...</> : <><Flame className="w-4 h-4 mr-2" />Burn {burnType === "lp" ? "LP Tokens" : "Tokens"}</>}
            </Button>
          </div>
        </motion.div>
      </div>

      <WalletConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleConfirmedBurn}
        title="Confirm Burn"
        description="You are about to permanently destroy tokens. This action cannot be undone."
        details={burnType === "token" ? [
          { label: "Token", value: selectedTokenObj?.symbol || selectedToken },
          { label: "Amount", value: burnAmount },
        ] : [
          { label: "LP Address", value: lpAddress ? `${lpAddress.slice(0, 10)}...` : "" },
          { label: "Burn %", value: `${burnPercent[0]}%` },
        ]}
        fee="0.001"
        isLoading={isBurning}
        variant="destructive"
      />
    </div>
  );
};

export default BurnTokenPage;
