import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Rocket, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchPresale, recordContribution, type Presale } from "@/lib/launchpadService";
import { contribute, claimPresale, refundPresale } from "@/lib/blockchain/presale";
import { useWallet } from "@/hooks/useWallet";

interface Props { wallet: { address: string | null; isConnected: boolean }; onConnectWallet: () => void }

const PresaleDetail = ({ wallet, onConnectWallet }: Props) => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { getRawProvider, getFullAddress } = useWallet();
  const [p, setP] = useState<Presale | null>(null);
  const [amount, setAmount] = useState("");

  useEffect(() => { if (id) fetchPresale(id).then(setP); }, [id]);

  if (!p) return <div className="min-h-screen pt-24 text-center text-muted-foreground">Loading…</div>;

  const raised = Number(p.total_raised) / 1e18;
  const hard = Number(p.hard_cap_gyds) / 1e18;
  const soft = Number(p.soft_cap_gyds) / 1e18;
  const pct = hard > 0 ? (raised / hard) * 100 : 0;
  const ended = new Date(p.end_at) < new Date();

  const onContribute = async () => {
    const provider = getRawProvider(); const user = getFullAddress();
    if (!provider || !user) { onConnectWallet(); return; }
    if (!p.contract_address) { toast.error("Presale contract not deployed yet"); return; }
    try {
      const tx = await contribute({ provider, user, presale: p.contract_address, amountGyds: amount });
      await recordContribution({ presale_id: p.id, contributor_address: user.toLowerCase(), amount_gyds: amount, tokens_owed: "0", tx_hash: tx });
      toast.success("Contribution sent");
    } catch (e) { toast.error((e as Error).message); }
  };

  const onClaim = async () => {
    const provider = getRawProvider(); const user = getFullAddress();
    if (!provider || !user || !p.contract_address) return;
    try { await claimPresale({ provider, user, presale: p.contract_address }); toast.success("Claim sent"); }
    catch (e) { toast.error((e as Error).message); }
  };

  const onRefund = async () => {
    const provider = getRawProvider(); const user = getFullAddress();
    if (!provider || !user || !p.contract_address) return;
    try { await refundPresale({ provider, user, presale: p.contract_address }); toast.success("Refund sent"); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link to="/launchpad" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("common.back")}
        </Link>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-2"><Rocket className="w-5 h-5 text-primary" /><h1 className="text-2xl font-heading font-bold">Presale #{p.id.slice(0, 6)}</h1></div>
          <p className="text-xs font-mono text-muted-foreground mb-4">Token: {p.token_address}</p>

          <Progress value={pct} className="h-3 mb-2" />
          <div className="flex justify-between text-sm mb-6">
            <span>{raised.toFixed(2)} / {hard.toFixed(2)} GYDS</span>
            <span className="text-muted-foreground">Soft: {soft.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-6">
            <div className="bg-muted/30 p-2 rounded-lg"><p className="text-xs text-muted-foreground">Start</p><p>{new Date(p.start_at).toLocaleString()}</p></div>
            <div className="bg-muted/30 p-2 rounded-lg"><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> End</p><p>{new Date(p.end_at).toLocaleString()}</p></div>
            <div className="bg-muted/30 p-2 rounded-lg"><p className="text-xs text-muted-foreground">Cliff</p><p>{p.vesting_cliff_days} days</p></div>
            <div className="bg-muted/30 p-2 rounded-lg"><p className="text-xs text-muted-foreground">Vesting</p><p>{p.vesting_duration_days} days</p></div>
          </div>

          {!ended ? (
            <div className="space-y-2">
              <Input placeholder="Amount in GYDS" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
              <Button onClick={onContribute} className="btn-gradient w-full">{t("launchpad.contribute")}</Button>
            </div>
          ) : raised >= soft ? (
            <Button onClick={onClaim} className="btn-gradient w-full">{t("launchpad.claim")}</Button>
          ) : (
            <Button onClick={onRefund} variant="outline" className="w-full">{t("launchpad.refund")}</Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PresaleDetail;
