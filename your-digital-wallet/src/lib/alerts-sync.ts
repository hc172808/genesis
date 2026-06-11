/**
 * Cloud sync of price alerts via Lovable Cloud auth.
 * Stores the full export payload in `price_alerts_sync.payload`.
 */
import { supabase } from "@/integrations/supabase/client";
import { exportAlerts, importAlerts } from "@/lib/price-alerts";

export interface SyncStatus {
  user: { id: string; email?: string | null } | null;
  lastSyncedAt?: string | null;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { user: null };
  const { data: row } = await supabase
    .from("price_alerts_sync" as any)
    .select("updated_at")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return {
    user: { id: data.user.id, email: data.user.email },
    lastSyncedAt: (row as any)?.updated_at ?? null,
  };
}

export async function pushAlertsToCloud() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  const payload = exportAlerts();
  const { error } = await supabase
    .from("price_alerts_sync" as any)
    .upsert({ user_id: data.user.id, payload }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function pullAlertsFromCloud(mode: "merge" | "replace" = "replace") {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  const { data: row, error } = await supabase
    .from("price_alerts_sync" as any)
    .select("payload")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!row || !(row as any).payload) return { imported: 0, total: 0 };
  return importAlerts(JSON.stringify((row as any).payload), mode);
}

export async function signOutSync() {
  await supabase.auth.signOut();
}
