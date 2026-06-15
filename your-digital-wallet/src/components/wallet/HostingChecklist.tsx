import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { runHostingChecks, type HostingCheck } from "@/lib/hosting-checks";

const StatusIcon = ({ status }: { status: HostingCheck["status"] }) => {
  if (status === "pass") return <CheckCircle2 size={16} className="text-success" />;
  if (status === "fail") return <XCircle size={16} className="text-destructive" />;
  if (status === "manual") return <AlertTriangle size={16} className="text-primary" />;
  return <AlertTriangle size={16} className="text-muted-foreground" />;
};

const HostingChecklist = () => {
  const [checks, setChecks] = useState<HostingCheck[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setChecks(await runHostingChecks());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Live status of your deployment. Re-run after any server change.</p>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-xs text-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Re-check
        </button>
      </div>

      {(checks ?? []).map((c) => (
        <div key={c.id} className="p-3 rounded-lg bg-secondary/40 border border-border">
          <div className="flex items-start gap-2">
            <div className="mt-0.5"><StatusIcon status={c.status} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{c.title}</p>
                <span className={`text-[10px] uppercase tracking-wide font-bold ${
                  c.status === "pass" ? "text-success" :
                  c.status === "fail" ? "text-destructive" :
                  c.status === "manual" ? "text-primary" :
                  "text-muted-foreground"
                }`}>{c.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
              {c.hint && (
                <pre className="mt-1 text-[10px] text-muted-foreground bg-background/40 rounded px-2 py-1 overflow-x-auto">{c.hint}</pre>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HostingChecklist;
