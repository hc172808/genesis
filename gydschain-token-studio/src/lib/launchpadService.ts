/** Launchpad / Presale persistence (Postgres REST). */
const DB_API_URL = import.meta.env.VITE_DB_API_URL || "";
const DB_API_KEY = import.meta.env.VITE_DB_API_KEY || "";
const h = () => ({ "Content-Type": "application/json", apikey: DB_API_KEY, Authorization: `Bearer ${DB_API_KEY}` });
const isCfg = () => DB_API_URL && DB_API_KEY;

export interface Presale {
  id: string; token_address: string; owner_address: string; contract_address: string | null;
  soft_cap_gyds: string; hard_cap_gyds: string; price_per_token: string;
  total_raised: string; start_at: string; end_at: string;
  vesting_cliff_days: number; vesting_duration_days: number;
  whitelist_enabled: boolean; status: "pending" | "active" | "ended" | "cancelled"; network: string;
}

export interface PresaleContribution {
  id: string; presale_id: string; contributor_address: string;
  amount_gyds: string; tokens_owed: string; tokens_claimed: string;
  refunded: boolean; tx_hash?: string | null;
}

export const fetchPresales = async (network = "devnet"): Promise<Presale[]> => {
  if (!isCfg()) return [];
  try {
    const r = await fetch(`${DB_API_URL}/rest/v1/presales?network=eq.${network}&order=created_at.desc&select=*`, { headers: h() });
    return r.ok ? r.json() : [];
  } catch { return []; }
};

export const fetchPresale = async (id: string): Promise<Presale | null> => {
  if (!isCfg()) return null;
  try {
    const r = await fetch(`${DB_API_URL}/rest/v1/presales?id=eq.${id}&select=*`, { headers: h() });
    const d = await r.json();
    return d[0] ?? null;
  } catch { return null; }
};

export const createPresale = async (p: Partial<Presale>): Promise<Presale | null> => {
  if (!isCfg()) return null;
  try {
    const r = await fetch(`${DB_API_URL}/rest/v1/presales`, {
      method: "POST", headers: { ...h(), Prefer: "return=representation" }, body: JSON.stringify(p),
    });
    const d = await r.json();
    return d[0] ?? null;
  } catch { return null; }
};

export const recordContribution = async (c: Partial<PresaleContribution>): Promise<void> => {
  if (!isCfg()) return;
  try { await fetch(`${DB_API_URL}/rest/v1/presale_contributions`, { method: "POST", headers: h(), body: JSON.stringify(c) }); } catch {}
};
