import { useEffect, useState } from "react";
import { Cloud, CloudOff, LogIn, LogOut, Upload, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getSyncStatus, pushAlertsToCloud, pullAlertsFromCloud, signOutSync,
  type SyncStatus,
} from "@/lib/alerts-sync";

export default function CloudSyncCard({ onPulled }: { onPulled?: () => void }) {
  const [status, setStatus] = useState<SyncStatus>({ user: null });
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const refresh = async () => {
    try { setStatus(await getSyncStatus()); } catch { setStatus({ user: null }); }
  };

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, []);

  const submitAuth = async () => {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/alerts` },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      setAuthOpen(false);
      setEmail(""); setPassword("");
    } catch (e: any) {
      toast.error(e?.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const doPush = async () => {
    setBusy(true);
    try { await pushAlertsToCloud(); toast.success("Alerts uploaded"); await refresh(); }
    catch (e: any) { toast.error(e?.message || "Sync failed"); }
    finally { setBusy(false); }
  };
  const doPull = async () => {
    setBusy(true);
    try {
      const r = await pullAlertsFromCloud("replace");
      toast.success(`Pulled ${r.imported} alerts`);
      onPulled?.();
    } catch (e: any) { toast.error(e?.message || "Pull failed"); }
    finally { setBusy(false); }
  };

  if (!status.user) {
    return (
      <>
        <div className="bg-card border border-border rounded-xl p-4 mb-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <CloudOff size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Sync across devices</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sign in to keep your alerts and settings in sync everywhere.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => { setMode("signin"); setAuthOpen(true); }}>
                <LogIn size={14} className="mr-1" /> Sign in
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setMode("signup"); setAuthOpen(true); }}>
                Create account
              </Button>
            </div>
          </div>
        </div>
        <Dialog open={authOpen} onOpenChange={setAuthOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{mode === "signin" ? "Sign in" : "Create an account"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button className="w-full" onClick={submitAuth} disabled={busy || !email || password.length < 6}>
                {busy ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-xs text-muted-foreground w-full text-center"
              >
                {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
          <Cloud size={16} className="text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{status.user.email || "Signed in"}</p>
          <p className="text-xs text-muted-foreground">
            {status.lastSyncedAt
              ? `Last synced ${new Date(status.lastSyncedAt).toLocaleString()}`
              : "Not yet synced"}
          </p>
        </div>
        <button
          onClick={async () => { await signOutSync(); refresh(); toast.success("Signed out"); }}
          className="text-muted-foreground hover:text-foreground"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button size="sm" onClick={doPush} disabled={busy}>
          <Upload size={14} className="mr-1" /> Push
        </Button>
        <Button size="sm" variant="secondary" onClick={doPull} disabled={busy}>
          <Download size={14} className="mr-1" /> Pull
        </Button>
      </div>
    </div>
  );
}
