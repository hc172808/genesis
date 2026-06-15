/**
 * Background alerts service worker bridge.
 * - Registers /alerts-sw.js with a narrow scope so it doesn't intercept navigation.
 * - Mirrors current alerts/symbols/settings into the SW via postMessage.
 * - Requests periodic background sync (where supported).
 */
import { getAlerts, getSettings, getSymbolMeta } from "@/lib/price-alerts";

const SW_PATH = "/alerts-sw.js";
const SW_SCOPE = "/alerts-sw-scope/";

let registration: ServiceWorkerRegistration | null = null;

const isPreviewHost = () =>
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
   window.location.hostname.includes("lovableproject.com"));

const isInIframe = () => {
  try { return window.self !== window.top; } catch { return true; }
};

export async function registerAlertsSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (isPreviewHost() || isInIframe()) return null;
  try {
    registration = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
    try { localStorage.setItem("gyds_sw_last_update", String(Date.now())); } catch { /* ignore */ }
    registration.addEventListener("updatefound", () => {
      try { localStorage.setItem("gyds_sw_last_update", String(Date.now())); } catch { /* ignore */ }
    });
    syncStateToSW();
    // Try to enable periodic background sync (~15 min)
    try {
      const status = await (navigator.permissions as any)?.query({ name: "periodic-background-sync" });
      if (status?.state === "granted" && (registration as any).periodicSync) {
        await (registration as any).periodicSync.register("gyds-alerts-check", { minInterval: 15 * 60 * 1000 });
      }
    } catch { /* not supported */ }
    return registration;
  } catch {
    return null;
  }
}

export async function syncStateToSW() {
  if (!("serviceWorker" in navigator)) return;
  const reg = registration ?? (await navigator.serviceWorker.getRegistration(SW_SCOPE));
  const target = reg?.active || navigator.serviceWorker.controller;
  if (!target) return;
  target.postMessage({
    type: "SYNC_ALERTS",
    alerts: getAlerts(),
    symbols: getSymbolMeta(),
    settings: getSettings(),
  });
}

export async function triggerSWCheck() {
  if (!("serviceWorker" in navigator)) return;
  const reg = registration ?? (await navigator.serviceWorker.getRegistration(SW_SCOPE));
  reg?.active?.postMessage({ type: "RUN_CHECK" });
}

export function bindSWMessageBridge(onTriggered: () => void) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const handler = (event: MessageEvent) => {
    const t = event.data?.type;
    if (t === "ALERTS_TRIGGERED") onTriggered();
    if (t === "OPEN_ALERTS" && window.location.pathname !== "/alerts") {
      window.location.assign("/alerts");
    }
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
