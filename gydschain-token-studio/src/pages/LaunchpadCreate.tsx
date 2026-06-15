import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createPresale } from "@/lib/launchpadService";
import { toWei } from "@/lib/blockchain/dexRouter";

interface Props { wallet: { address: string | null; isConnected: boolean } }

const LaunchpadCreate = ({ wallet }: Props) => {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [form, setForm] = useState({
    tokenAddress: "", softCap: "100", hardCap: "1000", price: "0.001",
    start: new Date().toISOString().slice(0, 16),
    end: new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 16),
    cliffDays: 0, vestingDays: 30, whitelist: false,
  });
  const [busy, setBusy] = useState(false);

  if (!wallet.isConnected) return <div className="min-h-screen pt-24 text-center text-muted-foreground">Connect wallet</div>;

  const submit = async () => {
    if (!form.tokenAddress) { toast.error("Token address required"); return; }
    setBusy(true);
    const p = await createPresale({
      token_address: form.tokenAddress.toLowerCase(),
      owner_address: wallet.address!.toLowerCase(),
      soft_cap_gyds: toWei(form.softCap).toString(),
      hard_cap_gyds: toWei(form.hardCap).toString(),
      price_per_token: toWei(form.price).toString(),
      start_at: new Date(form.start).toISOString(),
      end_at: new Date(form.end).toISOString(),
      vesting_cliff_days: form.cliffDays, vesting_duration_days: form.vestingDays,
      whitelist_enabled: form.whitelist, status: "pending", network: "devnet",
    });
    setBusy(false);
    if (p) { toast.success("Presale created"); nav(`/launchpad/${p.id}`); }
    else toast.error("Could not create presale");
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Rocket className="w-6 h-6 text-primary" /> {t("launchpad.create")}</h1>
          <div><Label>Token contract</Label><Input value={form.tokenAddress} onChange={(e) => setForm({ ...form, tokenAddress: e.target.value })} placeholder="0x…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("launchpad.softCap")} (GYDS)</Label><Input type="number" value={form.softCap} onChange={(e) => setForm({ ...form, softCap: e.target.value })} /></div>
            <div><Label>{t("launchpad.hardCap")} (GYDS)</Label><Input type="number" value={form.hardCap} onChange={(e) => setForm({ ...form, hardCap: e.target.value })} /></div>
          </div>
          <div><Label>Price per token (GYDS)</Label><Input type="number" step="0.000001" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
            <div><Label>End</Label><Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cliff (days)</Label><Input type="number" value={form.cliffDays} onChange={(e) => setForm({ ...form, cliffDays: +e.target.value })} /></div>
            <div><Label>Vesting (days)</Label><Input type="number" value={form.vestingDays} onChange={(e) => setForm({ ...form, vestingDays: +e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-3"><Switch checked={form.whitelist} onCheckedChange={(v) => setForm({ ...form, whitelist: v })} /><Label>Whitelist only</Label></div>
          <Button onClick={submit} disabled={busy} className="btn-gradient w-full">{busy ? "Creating…" : t("launchpad.create")}</Button>
        </motion.div>
      </div>
    </div>
  );
};

export default LaunchpadCreate;
