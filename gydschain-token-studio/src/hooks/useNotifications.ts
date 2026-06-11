import { useEffect, useState, useCallback } from "react";
import {
  fetchNotifications, markRead, markAllRead,
  type AppNotification,
} from "@/lib/notificationsService";

export const useNotifications = (address: string | null) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!address) { setItems([]); return; }
    setLoading(true);
    const data = await fetchNotifications(address);
    setItems(data);
    setLoading(false);
  }, [address]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const onNew = (e: Event) => {
      const n = (e as CustomEvent).detail as AppNotification;
      if (!address || n.user_address.toLowerCase() !== address.toLowerCase()) return;
      setItems((p) => [n, ...p]);
    };
    window.addEventListener("gyds:notification", onNew);
    return () => window.removeEventListener("gyds:notification", onNew);
  }, [address]);

  const unread = items.filter((n) => !n.read_at).length;

  return {
    items, loading, unread, reload,
    markRead: (id: string) => {
      if (!address) return;
      setItems((p) => p.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      markRead(address, id);
    },
    markAllRead: () => {
      if (!address) return;
      const now = new Date().toISOString();
      setItems((p) => p.map((n) => ({ ...n, read_at: n.read_at ?? now })));
      markAllRead(address);
    },
  };
};
