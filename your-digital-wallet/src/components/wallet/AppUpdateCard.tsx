import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { APP_VERSION } from "@/lib/network-config";

/**
 * Tells the user the app keeps working while a new build is being installed.
 * Shows the running version + the last detected service-worker update time,
 * and offers a Refresh CTA when a new SW is waiting.
 */
const AppUpdateCard = () => {
  const [updateReady, setUpdateReady] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(
    localStorage.getItem("gyds_last_sw_update"),
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (cancelled || !reg) return;
      if (reg.waiting) setUpdateReady(true);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });

    const onControllerChange = () => {
      const ts = new Date().toISOString();
      localStorage.setItem("gyds_last_sw_update", ts);
      setLastUpdate(ts);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const handleRefresh = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <div className="bg-card rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw size={16} className="text-primary" />
        <p className="text-sm font-semibold text-foreground">App updates</p>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Running version</span>
        <span className="font-mono text-foreground">v{APP_VERSION}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock size={12} /> Last update applied</span>
        <span className="font-mono">{lastUpdate ? new Date(lastUpdate).toLocaleString() : "never"}</span>
      </div>

      {updateReady ? (
        <button
          onClick={handleRefresh}
          className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90"
        >
          <RefreshCw size={14} /> Refresh to apply update
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2">
          <CheckCircle2 size={14} className="text-success" />
          You can keep using the app while updates install in the background.
        </div>
      )}
    </div>
  );
};

export default AppUpdateCard;
