import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, Download, Eye } from "lucide-react";

const LAST_UPDATE_KEY = "gyds_sw_last_update";

export function recordSwUpdate() {
  try {
    localStorage.setItem(LAST_UPDATE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

const formatRelative = (ts: number): string => {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const isPreviewContext = (): boolean => {
  if (typeof window === "undefined") return false;
  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const hostname = window.location.hostname;
  const previewHost =
    hostname.includes("id-preview--") || hostname.includes("lovableproject.com");
  return inIframe || previewHost;
};

const PwaStatusBanner = () => {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [hasSw, setHasSw] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const previewMode = isPreviewContext();

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    setLastUpdate(parseInt(localStorage.getItem(LAST_UPDATE_KEY) || "0", 10));

    const cleanups: Array<() => void> = [
      () => window.removeEventListener("online", onOnline),
      () => window.removeEventListener("offline", onOffline),
    ];

    if ("serviceWorker" in navigator && !previewMode) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        setHasSw(regs.length > 0);
        regs.forEach((reg) => {
          if (reg.waiting) setWaitingWorker(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                setWaitingWorker(installing);
                // eslint-disable-next-line no-console
                console.info("[sw] update ready at", new Date().toISOString());
              }
            });
          });
        });
      });

      const onCtrlChange = () => {
        recordSwUpdate();
        setLastUpdate(Date.now());
        setHasSw(true);
        setWaitingWorker(null);
        // eslint-disable-next-line no-console
        console.info("[sw] controller changed at", new Date().toISOString());
      };
      navigator.serviceWorker.addEventListener("controllerchange", onCtrlChange);
      cleanups.push(() => navigator.serviceWorker.removeEventListener("controllerchange", onCtrlChange));
    }

    return () => cleanups.forEach((fn) => fn());
  }, [previewMode]);

  const applyUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    // Reload after a short delay so the new worker can take control.
    setTimeout(() => window.location.reload(), 250);
  };

  // Update prompt takes priority when a new SW is waiting.
  if (waitingWorker) {
    return (
      <div
        className="mb-4 rounded-xl border px-3 py-2 flex items-center gap-2 text-xs bg-primary/10 border-primary/30 text-foreground"
        role="status"
        aria-live="polite"
      >
        <Download size={14} className="text-primary" />
        <span className="font-semibold">App update ready</span>
        <button
          onClick={applyUpdate}
          className="ml-auto px-3 py-1 rounded-md gradient-primary text-primary-foreground font-semibold"
        >
          Refresh
        </button>
      </div>
    );
  }

  // Preview/iframe: show a stable, informative line so the banner behaviour is consistent.
  if (previewMode) {
    return (
      <div
        className="mb-4 rounded-xl border px-3 py-2 flex items-center gap-2 text-xs bg-card border-border text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Eye size={14} />
        <span className="font-semibold">Preview mode</span>
        <span className="ml-auto">PWA features disabled in editor</span>
      </div>
    );
  }

  // Hide entirely when fully online + no SW (nothing useful to surface)
  if (online && !hasSw) return null;

  return (
    <div
      className={`mb-4 rounded-xl border px-3 py-2 flex items-center gap-2 text-xs ${
        online
          ? "bg-card border-border text-muted-foreground"
          : "bg-destructive/10 border-destructive/30 text-destructive"
      }`}
      role="status"
      aria-live="polite"
    >
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span className="font-semibold">
        {online ? "Online" : "Offline"}
      </span>
      {hasSw && (
        <span className="flex items-center gap-1 ml-auto">
          <RefreshCw size={12} />
          <span>SW updated {formatRelative(lastUpdate)}</span>
        </span>
      )}
      {!online && !hasSw && (
        <span className="ml-auto">Cached app shell available</span>
      )}
    </div>
  );
};

export default PwaStatusBanner;
