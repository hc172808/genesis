/* GYDS Wallet — Alerts Service Worker
 * Runs price-alert checks in the background and shows OS notifications.
 * Scope is intentionally narrow (/alerts-sw-scope/) to avoid intercepting navigation.
 */
const STORE_NAME = "gyds-alerts-store";
const DB_NAME = "gyds-alerts-db";
const COINGECKO = "https://api.coingecko.com/api/v3/simple/price";

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener("message", async (event) => {
  const data = event.data || {};
  if (data.type === "SYNC_ALERTS") {
    await dbSet("alerts", data.alerts || []);
    await dbSet("symbols", data.symbols || {});
    await dbSet("settings", data.settings || {});
  }
  if (data.type === "RUN_CHECK") {
    await runCheck();
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "gyds-alerts-check") {
    event.waitUntil(runCheck());
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if ("focus" in c) {
        c.postMessage({ type: "OPEN_ALERTS" });
        return c.focus();
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow("/alerts");
  })());
});

async function runCheck() {
  try {
    const alerts = (await dbGet("alerts")) || [];
    const symbols = (await dbGet("symbols")) || {};
    const settings = (await dbGet("settings")) || {};
    const active = alerts.filter((a) => a.active && !a.triggeredAt);
    if (active.length === 0) return;

    const ids = [...new Set(active.map((a) => symbols[a.symbol.toUpperCase()]?.id).filter(Boolean))];
    if (ids.length === 0) return;
    const url = `${COINGECKO}?ids=${ids.join(",")}&vs_currencies=usd`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();

    const triggered = [];
    const updated = alerts.map((a) => {
      if (!a.active || a.triggeredAt) return a;
      const id = symbols[a.symbol.toUpperCase()]?.id;
      const usd = id ? data[id]?.usd : undefined;
      if (typeof usd !== "number") return a;
      const hit =
        (a.direction === "above" && usd >= a.threshold) ||
        (a.direction === "below" && usd <= a.threshold);
      if (!hit) return a;
      triggered.push({ ...a, price: usd });
      return { ...a, triggeredAt: Date.now(), active: false };
    });

    if (triggered.length === 0) return;
    await dbSet("alerts", updated);

    for (const t of triggered) {
      await self.registration.showNotification(`${t.symbol} ${t.direction} $${t.threshold}`, {
        body: `Now trading at $${t.price}`,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: `gyds-alert-${t.id}`,
        data: { url: "/alerts" },
        vibrate: settings.vibration ? [120, 60, 120] : undefined,
      });
    }

    // Notify open clients to refresh UI state
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clients) c.postMessage({ type: "ALERTS_TRIGGERED", triggered });
  } catch (e) {
    // swallow — background work
  }
}
