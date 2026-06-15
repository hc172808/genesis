/** Governance proposals persistence (Postgres REST). */
const DB_API_URL = import.meta.env.VITE_DB_API_URL || "";
const DB_API_KEY = import.meta.env.VITE_DB_API_KEY || "";
const h = () => ({ "Content-Type": "application/json", apikey: DB_API_KEY, Authorization: `Bearer ${DB_API_KEY}` });
const isCfg = () => DB_API_URL && DB_API_KEY;

export interface Proposal {
  id: string; proposer_address: string; title: string; description: string | null;
  start_at: string; end_at: string; quorum: string;
  for_votes: string; against_votes: string; abstain_votes: string;
  status: "active" | "succeeded" | "defeated"; created_at: string;
}

export interface ProposalVote {
  id: string; proposal_id: string; voter_address: string;
  choice: "for" | "against" | "abstain"; weight: string; tx_hash: string | null;
}

export const fetchProposals = async (network = "devnet"): Promise<Proposal[]> => {
  if (!isCfg()) return [];
  try {
    const r = await fetch(`${DB_API_URL}/rest/v1/proposals?network=eq.${network}&order=created_at.desc&select=*`, { headers: h() });
    return r.ok ? r.json() : [];
  } catch { return []; }
};

export const fetchProposal = async (id: string): Promise<Proposal | null> => {
  if (!isCfg()) return null;
  try {
    const r = await fetch(`${DB_API_URL}/rest/v1/proposals?id=eq.${id}&select=*`, { headers: h() });
    if (!r.ok) return null;
    const d = await r.json();
    return d[0] ?? null;
  } catch { return null; }
};

export const createProposal = async (p: Partial<Proposal> & { network?: string }): Promise<Proposal | null> => {
  if (!isCfg()) return null;
  try {
    const r = await fetch(`${DB_API_URL}/rest/v1/proposals`, {
      method: "POST", headers: { ...h(), Prefer: "return=representation" }, body: JSON.stringify(p),
    });
    const d = await r.json();
    return d[0] ?? null;
  } catch { return null; }
};

export const recordVote = async (v: Partial<ProposalVote>): Promise<void> => {
  if (!isCfg()) return;
  try { await fetch(`${DB_API_URL}/rest/v1/proposal_votes`, { method: "POST", headers: h(), body: JSON.stringify(v) }); } catch {}
};
