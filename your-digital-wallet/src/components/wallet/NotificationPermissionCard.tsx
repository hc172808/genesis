import { useEffect, useState } from "react";
import { Bell, ShieldAlert, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { requestNotificationPermission, pushNotify } from "@/lib/price-alerts";

const isIOS = () =>
  /iP(hone|od|ad)/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

export default function NotificationPermissionCard() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    supported ? Notification.permission : "unsupported"
  );
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onFocus = () => {
      if (supported) setPermission(Notification.permission);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [supported]);

  const enable = async () => {
    const p = await requestNotificationPermission();
    setPermission(p);
    if (p === "granted") {
      toast.success("Notifications enabled");
      pushNotify("GYDS Wallet", "You'll get price alerts here.");
    } else {
      setShowHelp(true);
      toast.error("Permission not granted");
    }
  };

  const sendTest = () => {
    pushNotify("Test alert", "This is what an alert looks like.");
    toast.success("Test notification sent");
  };

  if (permission === "granted") {
    return (
      <div className="bg-success/10 border border-success/20 rounded-xl p-3 mb-4 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-success shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium">Notifications enabled</p>
          <p className="text-xs text-muted-foreground">Alerts will show even with the app in the background.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={sendTest}>Test</Button>
      </div>
    );
  }

  if (permission === "unsupported") {
    return (
      <div className="bg-card border border-border rounded-xl p-3 mb-4 flex items-start gap-3">
        <ShieldAlert size={18} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Notifications aren't supported in this browser. Add the app to your Home Screen for the best experience.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Bell size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {permission === "denied" ? "Notifications blocked" : "Enable notifications"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {permission === "denied"
              ? "We can't ask again until you re-allow them in your browser settings."
              : "Get alerted the moment a token hits your target price."}
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {permission !== "denied" && (
              <Button size="sm" onClick={enable}>Allow notifications</Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setShowHelp((v) => !v)}>
              {showHelp ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
              Troubleshoot
            </Button>
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="mt-4 pt-4 border-t border-border space-y-3 text-xs text-muted-foreground">
          {isIOS() && !isStandalone() && (
            <div>
              <p className="font-semibold text-foreground">📱 iOS — install first</p>
              <p>Tap the Share icon in Safari → <b>Add to Home Screen</b>. Open the app from the Home Screen, then come back here and tap Allow.</p>
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground">Chrome / Edge / Brave</p>
            <p>Tap the lock or info icon in the address bar → <b>Site settings</b> → set Notifications to <b>Allow</b>, then reload.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Safari (macOS)</p>
            <p>Safari → Settings → Websites → Notifications → set this site to <b>Allow</b>.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Android Chrome</p>
            <p>Long-press the address bar → Site settings → Permissions → Notifications → <b>Allow</b>.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Still not working?</p>
            <p>Make sure system-level "Do Not Disturb" / Focus is off, and the browser itself has notification permission in your OS settings.</p>
          </div>
        </div>
      )}
    </div>
  );
}
