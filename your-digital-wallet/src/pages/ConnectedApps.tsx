import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, Trash2, Unplug, Inbox, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import { getSessions, removeSession, clearAllSessions, type DAppSession } from "@/lib/dapp-connector";
import { useToast } from "@/hooks/use-toast";

const ConnectedApps = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<DAppSession[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleDisconnect = (origin: string) => {
    removeSession(origin);
    setSessions(getSessions());
    toast({ title: "dApp disconnected" });
  };

  const handleDisconnectAll = () => {
    clearAllSessions();
    setSessions([]);
    toast({ title: "All dApps disconnected" });
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/settings" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </Link>
          {sessions.length > 0 && (
            <button
              onClick={handleDisconnectAll}
              className="text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1"
            >
              <Unplug size={12} /> Disconnect All
            </button>
          )}
        </div>

        <h1 className="text-xl font-display font-bold text-foreground mb-2">Connected Apps</h1>
        <p className="text-xs text-muted-foreground mb-6">
          dApps with active wallet connections. Disconnect any you no longer use.
        </p>

        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
              <Globe size={28} className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold mb-1">No connected apps</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              When you connect your wallet to a dApp, it will appear here. You can manage permissions and disconnect at any time.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, i) => (
              <motion.div
                key={session.origin}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 bg-card rounded-xl p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  {session.icon ? (
                    <img src={session.icon} alt="" className="w-6 h-6 rounded" />
                  ) : (
                    <Globe size={20} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{session.name || session.origin}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{session.origin}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Connected {formatDate(session.connectedAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleDisconnect(session.origin)}
                  className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default ConnectedApps;
