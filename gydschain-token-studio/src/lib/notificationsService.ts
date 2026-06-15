/** Notifications service — durable via REST API, also drives in-app toasts. */

const DB_API_URL = import.meta.env.VITE_DB_API_URL || "";
const DB_API_KEY = import.meta.env.VITE_DB_API_KEY || "";

const h = () => ({
  "Content-Type": "application/json",
  apikey: DB_API_KEY,
  Authorization: `Bearer ${DB_API_KEY}`,
});

const isCfg = () => DB_API_URL.length > 0 && DB_API_KEY.length > 0;

export type NotificationType =
  | "tx_success" | "tx_failed"
  | "hosting_expiry" | "governance" | "staking_rewards" | "price_alert" | "system";

export interface AppNotification {
  id: string;
  user_address: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const LOCAL_KEY = (addr: string) => `gyds_notifications_${addr.toLowerCase()}`;

const readLocal = (addr: string): AppNotification[] => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY(addr)) || "[]"); } catch { return []; }
};
const writeLocal = (addr: string, items: AppNotification[]) =>
  localStorage.setItem(LOCAL_KEY(addr), JSON.stringify(items.slice(0, 200)));

export const fetchNotifications = async (address: string): Promise<AppNotification[]> => {
  if (!isCfg()) return readLocal(address);
  try {
    const res = await fetch(
      `${DB_API_URL}/rest/v1/notifications?user_address=eq.${address.toLowerCase()}&order=created_at.desc&limit=100&select=*`,
      { headers: h() }
    );
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return readLocal(address);
  }
};

export const createNotification = async (
  n: Omit<AppNotification, "id" | "read_at" | "created_at">
): Promise<AppNotification> => {
  const optimistic: AppNotification = {
    ...n,
    id: crypto.randomUUID(),
    read_at: null,
    created_at: new Date().toISOString(),
  };
  const local = readLocal(n.user_address);
  writeLocal(n.user_address, [optimistic, ...local]);

  if (isCfg()) {
    try {
      await fetch(`${DB_API_URL}/rest/v1/notifications`, {
        method: "POST",
        headers: { ...h(), Prefer: "return=representation" },
        body: JSON.stringify({ ...n, user_address: n.user_address.toLowerCase() }),
      });
    } catch (e) { console.warn("[notif]", e); }
  }
  window.dispatchEvent(new CustomEvent("gyds:notification", { detail: optimistic }));
  return optimistic;
};

export const markRead = async (address: string, id: string) => {
  const local = readLocal(address).map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n);
  writeLocal(address, local);
  if (isCfg()) {
    try {
      await fetch(`${DB_API_URL}/rest/v1/notifications?id=eq.${id}`, {
        method: "PATCH", headers: h(), body: JSON.stringify({ read_at: new Date().toISOString() }),
      });
    } catch {}
  }
};

export const markAllRead = async (address: string) => {
  const now = new Date().toISOString();
  const local = readLocal(address).map((n) => ({ ...n, read_at: n.read_at ?? now }));
  writeLocal(address, local);
  if (isCfg()) {
    try {
      await fetch(`${DB_API_URL}/rest/v1/notifications?user_address=eq.${address.toLowerCase()}&read_at=is.null`, {
        method: "PATCH", headers: h(), body: JSON.stringify({ read_at: now }),
      });
    } catch {}
  }
};
