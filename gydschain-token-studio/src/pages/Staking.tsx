import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchStakingPools, recordStakeAction, type StakingPool } from "@/lib/stakingService";
import { approveAndStake, unstake, claimRewards, readEarned, readStakedBalance } from "@/lib/blockchain/stakingClient";
import { useWallet } from "@/hooks/useWallet";
import { WalletConfirmDialog } from "@/components/WalletConfirmDialog";
import { createNotification } from "@/lib/notificationsService";

interface Props { wallet: { address: string | null; isConnected: boolean }; onConnectWallet: () => void }

const StakingPage = ({ wallet, onConnectWallet }: Props) => {
  const { t } = useTranslation();
  const { getRawProvider, getFullAddress } = useWallet();
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [positions, setPositions] = useState<Record<string, { staked: string; earned: string }>>({});
  const [pending, setPending] = useState<{ pool: StakingPool; action: "stake" | "unstake" | "claim"; amount: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStakingPools().then((p) => { setPools(p); setLoading(false); });
  }, []);

  useEffect(() => {
    const addr = getFullAddress();
    if (!addr) return;
    pools.forEach(async (p) => {
      const [staked, earned] = await Promise.all([
        readStakedBalance(p.contract_address, addr).catch(() => 0n),
        readEarned(p.contract_address, addr).catch(() => 0n),
      ]);
      setPositions((prev) => ({ ...prev, [p.id]: { staked: staked.toString(), earned: earned.toString() } }));
    });
  }, [pools, getFullAddress]);

  const execute = async () => {
    if (!pending) return;
    const provider = getRawProvider(); const user = getFullAddress();
    if (!provider || !user) { toast.error("Wallet not connected"); return; }
    setSubmitting(true);
    try {
      let tx = "";
      if (pending.action === "stake") {
        const [, st] = await approveAndStake({ provider, user, stakingContract: pending.pool.contract_address, stakingToken: pending.pool.staking_token_address, amount: pending.amount });
        tx = st;
      } else if (pending.action === "unstake") {
        tx = await unstake({ provider, user, stakingContract: pending.pool.contract_address, amount: pending.amount });
      } else {
        tx = await claimRewards({ provider, user, stakingContract: pending.pool.contract_address });
      }
      await recordStakeAction({ pool_id: pending.pool.id, user_address: user.toLowerCase(), last_action_tx: tx });
      await createNotification({
        user_address: user, type: "tx_success",
        title: `${pending.action} successful`,
        body: `${pending.pool.name}: ${tx.slice(0, 10)}…`, link: "/staking",
      });
      toast.success(`${pending.action} confirmed`);
      setPending(null); setAmounts((a) => ({ ...a, [pending.pool.id]: "" }));
    } catch (e) {
      toast.error((e as Error).message || "Transaction failed");
    } finally { setSubmitting(false); }
  };

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Coins className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">{t("staking.title")}</h2>
          <p className="text-muted-foreground mb-6">{t("staking.subtitle")}</p>
          <Button onClick={onConnectWallet} className="btn-gradient"><Wallet className="w-4 h-4 mr-2" /> {t("common.connect")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-heading font-bold mb-1">{t("staking.title")}</h1>
          <p className="text-muted-foreground mb-8">{t("staking.subtitle")}</p>

          {loading ? (
            <div className="glass-card p-10 text-center text-muted-foreground">{t("common.loading")}</div>
          ) : pools.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Coins className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t("staking.noPools")}</p>
              <p className="text-xs text-muted-foreground mt-2">Admins can deploy a StakingRewards contract and register it.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {pools.map((p) => {
                const pos = positions[p.id];
                return (
                  <div key={p.id} className="glass-card p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-heading font-semibold">{p.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{p.contract_address.slice(0, 10)}…</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{t("staking.apr")}</p>
                        <p className="text-lg font-bold text-[hsl(var(--success))] flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" /> {p.apr}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">{t("staking.yourStake")}</p>
                        <p className="font-mono">{pos ? (Number(pos.staked) / 1e18).toFixed(4) : "—"}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">{t("staking.pendingRewards")}</p>
                        <p className="font-mono text-primary">{pos ? (Number(pos.earned) / 1e18).toFixed(4) : "—"}</p>
                      </div>
                    </div>
                    <Tabs defaultValue="stake">
                      <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="stake">{t("staking.stake")}</TabsTrigger>
                        <TabsTrigger value="unstake">{t("staking.unstake")}</TabsTrigger>
                        <TabsTrigger value="claim">{t("staking.claim")}</TabsTrigger>
                      </TabsList>
                      <TabsContent value="stake" className="mt-3 space-y-2">
                        <Input placeholder="0.0" value={amounts[p.id] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [p.id]: e.target.value }))} />
                        <Button className="w-full btn-gradient" onClick={() => setPending({ pool: p, action: "stake", amount: amounts[p.id] ?? "0" })}>{t("staking.stake")}</Button>
                      </TabsContent>
                      <TabsContent value="unstake" className="mt-3 space-y-2">
                        <Input placeholder="0.0" value={amounts[p.id] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [p.id]: e.target.value }))} />
                        <Button variant="outline" className="w-full" onClick={() => setPending({ pool: p, action: "unstake", amount: amounts[p.id] ?? "0" })}>{t("staking.unstake")}</Button>
                      </TabsContent>
                      <TabsContent value="claim" className="mt-3">
                        <Button className="w-full" onClick={() => setPending({ pool: p, action: "claim", amount: "0" })}>{t("staking.claim")}</Button>
                      </TabsContent>
                    </Tabs>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
      {pending && (
        <WalletConfirmDialog
          open={!!pending} onOpenChange={(o) => !o && setPending(null)}
          onConfirm={execute} isLoading={submitting}
          title={`Confirm ${pending.action}`}
          description={`This will sign an on-chain transaction. Action is final.`}
          details={[
            { label: "Pool", value: pending.pool.name },
            { label: "Action", value: pending.action },
            ...(pending.action !== "claim" ? [{ label: "Amount", value: pending.amount }] : []),
          ]}
        />
      )}
    </div>
  );
};

export default StakingPage;
