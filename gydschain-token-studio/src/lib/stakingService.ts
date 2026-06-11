/** Staking pools persistence layer (Postgres REST). */
const DB_API_URL = import.meta.env.VITE_DB_API_URL || "";
const DB_API_KEY = import.meta.env.VITE_DB_API_KEY || "";
const h = () => ({ "Content-Type": "application/json", apikey: DB_API_KEY, Authorization: `Bearer ${DB_API_KEY}` });
const isCfg = () => DB_API_URL && DB_API_KEY;

export interface StakingPool {
  id: string; name: string; staking_token_address: string; reward_token_address: string;
  contract_address: string; network: string; apr: number; total_staked: string; is_active: boolean;
}

export interface StakingPosition {
  id: string; pool_id: string; user_address: string;
  amount_staked: string; rewards_claimed: string; last_action_tx: string | null;
}

export const fetchStakingPools = async (network = "devnet"): Promise<StakingPool[]> => {
  if (!isCfg()) return [];
  try {
    const r = await fetch(`${DB_API_URL}/rest/v1/staking_pools?network=eq.${network}&is_active=eq.true&select=*`, { headers: h() });
    return r.ok ? r.json() : [];
  } catch { return []; }
};

export const recordStakeAction = async (data: Partial<StakingPosition>): Promise<void> => {
  if (!isCfg()) return;
  try {
    await fetch(`${DB_API_URL}/rest/v1/staking_positions`, {
      method: "POST", headers: { ...h(), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(data),
    });
  } catch {}
};
