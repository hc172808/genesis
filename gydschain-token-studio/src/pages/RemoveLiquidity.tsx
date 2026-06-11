import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Info, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { WalletConfirmDialog } from "@/components/WalletConfirmDialog";
import { DexNotDeployedGate } from "@/components/DexNotDeployedGate";

interface RemoveLiquidityPageProps {
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  onRemoveLiquidity?: (tokenAddress: string, percent: number) => Promise<string>;
}

const RemoveLiquidityPage = ({ isWalletConnected, onConnectWallet, onRemoveLiquidity }: RemoveLiquidityPageProps) => {
  const [tokenAddress, setTokenAddress] = useState("");
  const [removePercent, setRemovePercent] = useState([50]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRequestRemove = () => {
    if (!isWalletConnected) { onConnectWallet(); return; }
    if (!tokenAddress) { toast.error("Enter the token address"); return; }
    setShowConfirm(true);
  };

  const handleRemove = async () => {
    setShowConfirm(false);
    if (!onRemoveLiquidity) { toast.error("Liquidity handler unavailable"); return; }
    setIsRemoving(true);
    try {
      await onRemoveLiquidity(tokenAddress, removePercent[0]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove liquidity");
    }
    setIsRemoving(false);
  };

  if (!isWalletConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Minus className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Connect a wallet to remove liquidity.</p>
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
            Remove <span className="gradient-text">Liquidity</span>
          </h1>
          <p className="text-muted-foreground mb-8">Withdraw your liquidity from a token-GYDS pool</p>

          <DexNotDeployedGate />

          <div className="glass-card p-6 space-y-6">
            <div>
              <Label>Token Address</Label>
              <Input value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="0x... (token paired with GYDS)" className="mt-1.5 bg-muted/50 border-border/50 font-mono text-sm" />
              <p className="text-xs text-muted-foreground mt-1">Enter the token address — the router resolves the GYDS pair automatically.</p>
            </div>

            <div>
              <Label>Amount to Remove</Label>
              <div className="mt-3 bg-muted/30 rounded-xl p-6 text-center">
                <span className="text-5xl font-heading font-bold gradient-text">{removePercent[0]}%</span>
              </div>
              <Slider value={removePercent} onValueChange={setRemovePercent} min={1} max={100} step={1} className="mt-4" />
              <div className="flex justify-end gap-2 mt-3">
                {[25, 50, 75, 100].map((p) => (
                  <button key={p} onClick={() => setRemovePercent([p])} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${removePercent[0] === p ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
                    {p === 100 ? "MAX" : `${p}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Removing liquidity may result in impermanent loss. Cost: gas + 0.1 GYDS protocol fee.</span>
            </div>

            <Button onClick={handleRequestRemove} disabled={isRemoving || !tokenAddress} className="w-full btn-gradient">
              {isRemoving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Removing...</> : <>
                <Minus className="w-4 h-4 mr-2" />Remove Liquidity
              </>}
            </Button>
          </div>

          <WalletConfirmDialog
            open={showConfirm}
            onOpenChange={setShowConfirm}
            onConfirm={handleRemove}
            title="Remove Liquidity"
            description="You are about to withdraw liquidity from this pool."
            details={[
              { label: "Token", value: `${tokenAddress.slice(0, 10)}...` },
              { label: "Remove", value: `${removePercent[0]}%` },
            ]}
            fee="0.1"
            isLoading={isRemoving}
            variant="destructive"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default RemoveLiquidityPage;
