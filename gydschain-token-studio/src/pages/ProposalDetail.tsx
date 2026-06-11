import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ThumbsUp, ThumbsDown, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchProposal, recordVote, type Proposal } from "@/lib/governanceService";

interface Props { wallet: { address: string | null; isConnected: boolean }; onConnectWallet: () => void }

const ProposalDetail = ({ wallet, onConnectWallet }: Props) => {
  const { proposalId } = useParams();
  const { t } = useTranslation();
  const [p, setP] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (proposalId) fetchProposal(proposalId).then((x) => { setP(x); setLoading(false); }); }, [proposalId]);

  const vote = async (choice: "for" | "against" | "abstain") => {
    if (!wallet.address || !p) return;
    await recordVote({ proposal_id: p.id, voter_address: wallet.address.toLowerCase(), choice, weight: "1" });
    toast.success(`Voted ${choice}`);
  };

  if (loading) return <div className="min-h-screen pt-24 text-center text-muted-foreground">Loading…</div>;
  if (!p) return <div className="min-h-screen pt-24 text-center">Not found</div>;

  const total = BigInt(p.for_votes || "0") + BigInt(p.against_votes || "0") + BigInt(p.abstain_votes || "0");
  const pct = (v: string) => total === 0n ? 0 : Number((BigInt(v || "0") * 10000n) / total) / 100;

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link to="/governance" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("common.back")}
        </Link>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h1 className="text-2xl font-heading font-bold mb-3">{p.title}</h1>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-6">{p.description}</p>

          <div className="space-y-3 mb-6">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4 text-[hsl(var(--success))]" /> {t("governance.for")}</span><span>{pct(p.for_votes)}%</span></div>
              <Progress value={pct(p.for_votes)} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-1"><ThumbsDown className="w-4 h-4 text-destructive" /> {t("governance.against")}</span><span>{pct(p.against_votes)}%</span></div>
              <Progress value={pct(p.against_votes)} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-1"><MinusCircle className="w-4 h-4 text-muted-foreground" /> {t("governance.abstain")}</span><span>{pct(p.abstain_votes)}%</span></div>
              <Progress value={pct(p.abstain_votes)} className="h-2" />
            </div>
          </div>

          {wallet.isConnected ? (
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => vote("for")} className="btn-gradient">{t("governance.for")}</Button>
              <Button onClick={() => vote("against")} variant="destructive">{t("governance.against")}</Button>
              <Button onClick={() => vote("abstain")} variant="outline">{t("governance.abstain")}</Button>
            </div>
          ) : (
            <Button onClick={onConnectWallet} className="btn-gradient w-full">{t("common.connect")}</Button>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4">Voting ends {new Date(p.end_at).toLocaleString()}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ProposalDetail;
