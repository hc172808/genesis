import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Droplets, ArrowDown, Info, Loader2, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { activeConfig } from "@/lib/blockchain/config";
import { WalletConfirmDialog } from "@/components/WalletConfirmDialog";
import type { DeployedToken } from "@/lib/blockchain/types";
import { getPoolInfo, type PoolInfo } from "@/lib/blockchain/indexer";
import { DexNotDeployedGate } from "@/components/DexNotDeployedGate";

interface CreateLiquidityPageProps {
  tokens: DeployedToken[];
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  onAddLiquidity?: (tokenAddress: string, tokenAmount: string, gydsAmount: string) => Promise<string>;
}

const FEE_OPTIONS = [
  { value: "0.01", label: "0.01%" },
  { value: "0.05", label: "0.05%" },
  { value: "0.25", label: "0.25% (Recommended)" },
  { value: "1.00", label: "1.00%" },
];

const CreateLiquidityPage = ({ tokens, isWalletConnected, onConnectWallet, onAddLiquidity }: CreateLiquidityPageProps) => {
  const [selectedToken, setSelectedToken] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [gydsAmount, setGydsAmount] = useState("");
  const [feeTier, setFeeTier] = useState("0.25");
  const [supplyPercent, setSupplyPercent] = useState([95]);
  const [isCreating, setIsCreating] = useState(false);
  const [poolType, setPoolType] = useState<"cpmm" | "amm-v4">("cpmm");
  const [existingPool, setExistingPool] = useState<PoolInfo | null>(null);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedTokenData = tokens.find((t) => t.contractAddress === selectedToken);

  // Check for existing pool when token is selected
  useEffect(() => {
    if (!selectedToken) {
      setExistingPool(null);
      return;
    }

    const fetchPool = async () => {
      setIsLoadingPool(true);
      try {
        const pool = await getPoolInfo(selectedToken);
        setExistingPool(pool);
      } catch {
        setExistingPool(null);
      }
      setIsLoadingPool(false);
    };
    fetchPool();
  }, [selectedToken]);

  const handleSupplyChange = (val: number[]) => {
    setSupplyPercent(val);
    if (selectedTokenData) {
      const amount = Math.floor((Number(selectedTokenData.currentSupply) * val[0]) / 100);
      setTokenAmount(String(amount));
    }
  };

  // Calculate estimated starting price
  const startingPrice = tokenAmount && gydsAmount && Number(tokenAmount) > 0
    ? (Number(gydsAmount) / Number(tokenAmount)).toFixed(8)
    : null;

  const handleRequestCreate = () => {
    if (!isWalletConnected) { onConnectWallet(); return; }
    if (!selectedToken || !tokenAmount || !gydsAmount) { toast.error("Fill all fields"); return; }
    setShowConfirm(true);
  };

  const handleCreate = async () => {
    setShowConfirm(false);
    if (!onAddLiquidity) { toast.error("Liquidity handler unavailable"); return; }
    setIsCreating(true);
    try {
      await onAddLiquidity(selectedToken, tokenAmount, gydsAmount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create pool");
    }
    setIsCreating(false);
  };

  if (!isWalletConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Droplets className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Connect a wallet to create a liquidity pool.</p>
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
            Create <span className="gradient-text">Liquidity Pool</span>
          </h1>
          <p className="text-muted-foreground mb-8">Initialize a CPMM or AMM v4 pool on {activeConfig.networkName}</p>

          <DexNotDeployedGate />

          <div className="glass-card p-6 space-y-6">
            {/* Pool Type */}
            <div>
              <Label>Pool Type</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {(["cpmm", "amm-v4"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPoolType(type)}
                    className={`p-3 rounded-xl text-sm font-medium border transition-all ${poolType === type ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-muted/30 text-muted-foreground hover:border-border"}`}
                  >
                    {type === "cpmm" ? "CPMM Pool" : "AMM v4 Pool"}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Token */}
            <div>
              <Label>Select Token</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger className="mt-1.5 bg-muted/50 border-border/50">
                  <SelectValue placeholder="Choose your token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((t) => (
                    <SelectItem key={t.contractAddress} value={t.contractAddress}>
                      {t.name} ({t.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Existing pool indicator */}
              {isLoadingPool && (
                <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking for existing pools...
                </p>
              )}
              {existingPool && (
                <div className="mt-2 bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
                  <p className="text-primary font-medium flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Existing pool found
                  </p>
                  <p className="text-muted-foreground">Reserve 0: {(Number(existingPool.reserve0) / 1e18).toFixed(4)}</p>
                  <p className="text-muted-foreground">Reserve 1: {(Number(existingPool.reserve1) / 1e18).toFixed(4)}</p>
                  <p className="text-muted-foreground">LP Supply: {(Number(existingPool.totalSupply) / 1e18).toFixed(4)}</p>
                </div>
              )}
            </div>

            {/* Token Amount */}
            <div>
              <Label>Token Amount (Recommended 95%+)</Label>
              <Slider value={supplyPercent} onValueChange={handleSupplyChange} min={1} max={100} step={1} className="mt-3 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{supplyPercent[0]}% of supply</span>
                <div className="flex gap-2">
                  {[25, 50, 75, 95, 100].map((p) => (
                    <button key={p} onClick={() => handleSupplyChange([p])} className="px-2 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors">{p}%</button>
                  ))}
                </div>
              </div>
              <Input value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} placeholder="Token amount" className="bg-muted/50 border-border/50" />
            </div>

            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                <ArrowDown className="w-5 h-5 text-primary" />
              </div>
            </div>

            {/* GYDS Amount */}
            <div>
              <Label>GYDS Amount (Recommended 10+)</Label>
              <Input value={gydsAmount} onChange={(e) => setGydsAmount(e.target.value)} placeholder="Amount of GYDS to pair" className="mt-1.5 bg-muted/50 border-border/50" type="number" />
            </div>

            {/* Starting price estimate */}
            {startingPrice && (
              <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Starting Price</span>
                  <span className="text-foreground font-medium">1 token = {startingPrice} GYDS</span>
                </div>
                <div className="flex justify-between">
                  <span>Pool Type</span>
                  <span className="text-foreground">{poolType === "cpmm" ? "Constant Product (CPMM)" : "AMM v4"}</span>
                </div>
              </div>
            )}

            {/* Fee Tier */}
            <div>
              <Label>LP Fee Tier</Label>
              <Select value={feeTier} onValueChange={setFeeTier}>
                <SelectTrigger className="mt-1.5 bg-muted/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEE_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                LP providers earn 84% of trading fees. 16% goes to the protocol.
              </p>
            </div>

            {/* Info */}
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>The amount of GYDS determines the starting price. Pool creation costs 0.5 GYDS. You'll receive LP tokens in return.</span>
            </div>

            <Button onClick={handleRequestCreate} disabled={isCreating || !selectedToken || !tokenAmount || !gydsAmount} className="w-full btn-gradient">
              {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Pool...</> : <>
                <Droplets className="w-4 h-4 mr-2" />Initialize Liquidity Pool
              </>}
            </Button>
          </div>

          <WalletConfirmDialog
            open={showConfirm}
            onOpenChange={setShowConfirm}
            onConfirm={handleCreate}
            title="Create Liquidity Pool"
            description="You are about to initialize a new liquidity pool on GydsChain."
            details={[
              { label: "Token", value: selectedTokenData?.symbol || "" },
              { label: "Token Amount", value: Number(tokenAmount).toLocaleString() },
              { label: "GYDS Amount", value: gydsAmount },
              { label: "Pool Type", value: poolType === "cpmm" ? "CPMM" : "AMM v4" },
              { label: "Fee Tier", value: `${feeTier}%` },
            ]}
            fee="0.5"
            isLoading={isCreating}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default CreateLiquidityPage;
