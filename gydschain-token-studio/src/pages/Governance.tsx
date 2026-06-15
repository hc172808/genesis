import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Vote, Plus, ThumbsUp, ThumbsDown, MinusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchProposals, createProposal, type Proposal } from "@/lib/governanceService";

interface Props { wallet: { address: string | null; isConnected: boolean }; onConnectWallet: () => void }

const GovernancePage = ({ wallet, onConnectWallet }: Props) => {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const load = () => { setLoading(true); fetchProposals().then((p) => { setProposals(p); setLoading(false); }); };
  useEffect(load, []);

  const submit = async () => {
    if (!wallet.address || !title.trim()) return;
    const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 7);
    const p = await createProposal({
      proposer_address: wallet.address.toLowerCase(), title, description: desc,
      start_at: now.toISOString(), end_at: end.toISOString(),
      status: "active", network: "devnet",
    });
    if (p) { toast.success("Proposal created"); setOpen(false); setTitle(""); setDesc(""); load(); }
    else toast.error("Could not create proposal");
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold flex items-center gap-2"><Vote className="w-7 h-7 text-primary" /> {t("governance.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("governance.subtitle")}</p>
            </div>
            {wallet.isConnected ? (
              <Button onClick={() => setOpen(true)} className="btn-gradient"><Plus className="w-4 h-4 mr-1" /> {t("governance.newProposal")}</Button>
            ) : (
              <Button onClick={onConnectWallet} className="btn-gradient">{t("common.connect")}</Button>
            )}
          </div>

          {loading ? (
            <div className="glass-card p-10 text-center text-muted-foreground">{t("common.loading")}</div>
          ) : proposals.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">{t("governance.noProposals")}</div>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => {
                const total = BigInt(p.for_votes || "0") + BigInt(p.against_votes || "0") + BigInt(p.abstain_votes || "0");
                const pct = (v: string) => total === 0n ? 0 : Number((BigInt(v || "0") * 10000n) / total) / 100;
                return (
                  <Link key={p.id} to={`/governance/${p.id}`} className="block glass-card p-5 hover:border-primary/50 transition">
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <h3 className="font-heading font-semibold">{p.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" : "bg-muted/50"}`}>
                        {t(`governance.${p.status === "active" ? "active" : "ended"}`)}
                      </span>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-[hsl(var(--success))]" /> {pct(p.for_votes)}%</div>
                      <div className="flex items-center gap-1"><ThumbsDown className="w-3 h-3 text-destructive" /> {pct(p.against_votes)}%</div>
                      <div className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-muted-foreground" /> {pct(p.abstain_votes)}%</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("governance.newProposal")}</DialogTitle></DialogHeader>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description (markdown supported)" rows={6} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} className="btn-gradient" disabled={!title.trim()}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GovernancePage;
