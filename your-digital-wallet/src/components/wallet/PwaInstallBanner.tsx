import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIos = (): boolean => {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
};

const isInStandaloneMode = (): boolean => {
  return (
    ("standalone" in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
};

const isInIframe = (): boolean => {
  try { return window.self !== window.top; } catch { return true; }
};

const PwaInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show in iframes, preview, or standalone mode
    if (isInIframe() || isInStandaloneMode()) return;

    const hidden = localStorage.getItem("pwa_banner_dismissed");
    if (hidden) {
      const ts = parseInt(hidden, 10);
      if (Date.now() - ts < 3 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // iOS: show manual instructions after delay
    if (isIos()) {
      const timer = setTimeout(() => setShowIosBanner(true), 2000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Fallback: if no prompt fires after 3s on mobile, show iOS-style banner
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const isMobile = /android|mobile/i.test(navigator.userAgent);
    if (isMobile) {
      fallbackTimer = setTimeout(() => {
        if (!deferredPrompt) setShowIosBanner(true);
      }, 4000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
    handleDismiss();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIosBanner(false);
    localStorage.setItem("pwa_banner_dismissed", String(Date.now()));
  };

  // Nothing to show
  if (dismissed || (!deferredPrompt && !showIosBanner)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto"
      >
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            {showIosBanner ? <Share size={20} className="text-primary-foreground" /> : <Download size={20} className="text-primary-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install GYDS Wallet</p>
            {showIosBanner ? (
              <p className="text-xs text-muted-foreground">
                Tap <Share size={12} className="inline -mt-0.5" /> then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Add to home screen for the best experience</p>
            )}
          </div>
          {!showIosBanner && (
            <button
              onClick={handleInstall}
              className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shrink-0 active:scale-[0.97] transition-transform"
            >
              Install
            </button>
          )}
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PwaInstallBanner;
