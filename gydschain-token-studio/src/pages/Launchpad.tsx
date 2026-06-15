import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { fetchPresales, type Presale } from "@/lib/launchpadService";

interface Props { wallet: { address: string | null; isConnected: boolean }; onConnectWallet: () => void }

const LaunchpadPage = ({ wallet, onConnectWallet }: Props) => {
  const { t } = useTranslation();
  const [list, setList] = useState<Presale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPresales().then((p) => { setList(p); setLoading(false); }); }, []);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold flex items-center gap-2"><Rocket className="w-7 h-7 text-primary" /> {t("launchpad.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("launchpad.subtitle")}</p>
            </div>
            {wallet.isConnected ? (
              <Link to="/launchpad/create"><Button className="btn-gradient"><Plus className="w-4 h-4 mr-1" /> {t("launchpad.create")}</Button></Link>
            ) : (
              <Button onClick={onConnectWallet} className="btn-gradient">{t("common.connect")}</Button>
            )}
          </div>

          {loading ? (
            <div className="glass-card p-10 text-center text-muted-foreground">{t("common.loading")}</div>
          ) : list.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">No presales yet — be the first to create one.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {list.map((p) => {
                const raised = Number(p.total_raised) / 1e18;
                const hard = Number(p.hard_cap_gyds) / 1e18;
                const pct = hard > 0 ? (raised / hard) * 100 : 0;
                return (
                  <Link key={p.id} to={`/launchpad/${p.id}`} className="glass-card p-5 block hover:border-primary/50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">{p.token_address.slice(0, 10)}…</p>
                        <h3 className="font-heading font-semibold">Presale #{p.id.slice(0, 6)}</h3>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.status}</span>
                    </div>
                    <Progress value={pct} className="h-2 mb-2" />
                    <div className="flex justify-between text-xs">
                      <span>{t("launchpad.raised")}: {raised.toFixed(2)} GYDS</span>
                      <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(p.end_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LaunchpadPage;
