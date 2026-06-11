import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp, Gift, Loader2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { DeployedToken } from "@/lib/blockchain/types";

interface BurnAndEarnPageProps {
  tokens: DeployedToken[];
  isWalletConnected: boolean;
  onConnectWallet: () => void;
}

const MOCK_REWARDS = [
  { token: "GGOLD", burned: "50,000", earned: "2.5 GYDS", date: "2026-03-05" },
  { token: "NTFY", burned: "100,000", earned: "5.0 GYDS", date: "2026-03-04" },
];

const BurnAndEarnPage = ({ tokens, isWalletConnected, onConnectWallet }: BurnAndEarnPageProps) => {
  const [selectedToken, setSelectedToken] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [isBurning, setIsBurning] = useState(false);

  const estimatedReward = burnAmount ? (Number(burnAmount) * 0.00005).toFixed(4) : "0";

  const handleBurnAndEarn = async () => {
    if (!isWalletConnected) { onConnectWallet(); return; }
    setIsBurning(true);
    await new Promise((r) => setTimeout(r, 3000));
    setIsBurning(false);
    toast.success(`Burned ${Number(burnAmount).toLocaleString()} tokens & earned ${estimatedReward} GYDS!`);
    setBurnAmount("");
  };

  if (!isWalletConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Gift className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Connect a wallet to burn & earn.</p>
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
            Burn & <span className="gradient-text">Earn</span>
          </h1>
          <p className="text-muted-foreground mb-8">Burn tokens and earn GYDS rewards</p>

          <div className="glass-card p-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <Flame className="w-6 h-6 text-destructive mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Total Burned</p>
                <p className="font-heading font-bold text-lg">150K</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <TrendingUp className="w-6 h-6 text-[hsl(var(--success))] mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">GYDS Earned</p>
                <p className="font-heading font-bold text-lg">7.5</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <Gift className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Reward Rate</p>
                <p className="font-heading font-bold text-lg">0.005%</p>
              </div>
            </div>

            <div>
              <Label>Select Token</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger className="mt-1.5 bg-muted/50 border-border/50">
                  <SelectValue placeholder="Choose token" />
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
              <Input value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} placeholder="Tokens to burn" className="mt-1.5 bg-muted/50 border-border/50" type="number" />
            </div>

            {burnAmount && Number(burnAmount) > 0 && (
              <div className="bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/30 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Estimated Reward</p>
                <p className="text-2xl font-heading font-bold text-[hsl(var(--success))]">{estimatedReward} GYDS</p>
              </div>
            )}

            <Button onClick={handleBurnAndEarn} disabled={isBurning || !selectedToken || !burnAmount} className="w-full btn-gradient">
              {isBurning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Flame className="w-4 h-4 mr-2" />Burn & Earn</>}
            </Button>
          </div>

          {/* History */}
          <h2 className="text-xl font-heading font-bold mt-10 mb-4">Recent Burns</h2>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-4 text-muted-foreground font-medium">Token</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Burned</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Earned</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_REWARDS.map((r, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="p-4 font-mono text-primary">{r.token}</td>
                    <td className="p-4">{r.burned}</td>
                    <td className="p-4 text-[hsl(var(--success))]">{r.earned}</td>
                    <td className="p-4 text-muted-foreground hidden sm:table-cell">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BurnAndEarnPage;
