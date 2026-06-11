import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  checkAlerts,
  getPollIntervalMs,
  hydrateRegisteredSymbols,
} from "@/lib/price-alerts";
import { formatPrice } from "@/lib/price-fetcher";

/**
 * App-wide hook that polls active price alerts and shows toasts.
 * Polling interval is driven by global sensitivity setting.
 * Pass a custom intervalMs to override (e.g. on the Alerts page itself for snappier UI).
 */
export function usePriceAlertMonitor(intervalMs?: number) {
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    hydrateRegisteredSymbols();

    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const triggered = await checkAlerts();
      if (cancelled.current) return;
      for (const t of triggered) {
        toast.success(`🔔 ${t.symbol} ${t.direction} ${formatPrice(t.threshold)}`, {
          description: `Now trading at ${formatPrice(t.price)}`,
          duration: 8000,
        });
      }
      const next = intervalMs ?? getPollIntervalMs();
      timer = setTimeout(tick, next);
    };

    tick();
    return () => {
      cancelled.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs]);
}
