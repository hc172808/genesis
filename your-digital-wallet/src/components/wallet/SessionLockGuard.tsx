import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { isSessionLocked, unlockSession, recordActivity } from "@/lib/session-lock";
import { unlockWallet, hasWallet, checkLockout } from "@/lib/wallet-core";

interface Props {
  children: React.ReactNode;
}

const SessionLockGuard = ({ children }: Props) => {
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasWallet()) return;
    setLocked(isSessionLocked());
  }, []);

  // Track user activity to reset idle timer
  useEffect(() => {
    if (locked) return;
    const onActivity = () => recordActivity();
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [locked]);

  // Periodically check if session should be locked
  useEffect(() => {
    if (!hasWallet()) return;
    const interval = setInterval(() => {
      if (isSessionLocked()) setLocked(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUnlock = useCallback(async () => {
    if (!password) return;
    setError("");
    setLoading(true);

    const lockStatus = checkLockout();
    if (lockStatus.locked) {
      setError(`Locked for ${lockStatus.remainingSeconds}s`);
      setLoading(false);
      return;
    }

    try {
      await unlockWallet(password);
      unlockSession();
      setLocked(false);
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Wrong password");
    } finally {
      setLoading(false);
    }
  }, [password]);

  if (!locked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6 text-center"
      >
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto">
          <Lock size={32} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Wallet Locked</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your password to unlock</p>
        </div>

        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            <button onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            onClick={handleUnlock}
            disabled={loading || !password}
            className="w-full gradient-primary text-primary-foreground font-display font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? "Unlocking..." : "Unlock"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SessionLockGuard;
