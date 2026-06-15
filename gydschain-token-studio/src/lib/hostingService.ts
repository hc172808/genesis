/**
 * Hosting service layer for GydsChain Web Hosting.
 * Manages site CRUD, IPFS uploads, and payment tracking.
 */

const DB_API_URL = import.meta.env.VITE_DB_API_URL || "";
const DB_API_KEY = import.meta.env.VITE_DB_API_KEY || "";

const headers = () => ({
  "Content-Type": "application/json",
  apikey: DB_API_KEY,
  Authorization: `Bearer ${DB_API_KEY}`,
});

const isConfigured = () => DB_API_URL.length > 0 && DB_API_KEY.length > 0;

const apiFetch = async <T>(path: string, options?: RequestInit): Promise<T | null> => {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(`${DB_API_URL}${path}`, {
      ...options,
      headers: { ...headers(), ...options?.headers },
    });
    if (!res.ok) throw new Error(`Hosting API: ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn("[Hosting]", err);
    return null;
  }
};

// ─── Types ───────────────────────────────────────────────────

export interface HostingPlan {
  id: string;
  name: string;
  storage_limit_mb: number;
  price_gyds: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

export interface HostedSite {
  id: string;
  owner_address: string;
  plan_id: string;
  site_name: string;
  subdomain: string | null;
  ipfs_cid: string | null;
  current_size_bytes: number;
  is_active: boolean;
  is_auto_generated: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteFile {
  id: string;
  site_id: string;
  file_path: string;
  ipfs_cid: string;
  file_size: number;
  mime_type: string | null;
}

export interface HostingPayment {
  id: string;
  site_id: string;
  payer_address: string;
  amount_gyds: number;
  transaction_hash: string | null;
  period_start: string;
  period_end: string;
  status: string;
}

export interface SiteDomain {
  id: string;
  site_id: string;
  domain: string;
  status: "pending" | "verifying" | "active" | "failed";
  is_primary: boolean;
  ssl_enabled: boolean;
  verification_token: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Plans ───────────────────────────────────────────────────

export const fetchHostingPlans = async (): Promise<HostingPlan[]> => {
  const data = await apiFetch<HostingPlan[]>(
    `/rest/v1/hosting_plans?is_active=eq.true&order=storage_limit_mb.asc&select=*`
  );
  return data ?? [];
};

// ─── Sites ───────────────────────────────────────────────────

export const fetchUserSites = async (ownerAddress: string): Promise<HostedSite[]> => {
  const data = await apiFetch<HostedSite[]>(
    `/rest/v1/hosted_sites?owner_address=eq.${ownerAddress}&order=created_at.desc&select=*`
  );
  return data ?? [];
};

export const createSite = async (site: Partial<HostedSite>): Promise<HostedSite | null> => {
  const data = await apiFetch<HostedSite[]>(`/rest/v1/hosted_sites`, {
    method: "POST",
    body: JSON.stringify(site),
    headers: { Prefer: "return=representation" },
  });
  return data?.[0] ?? null;
};

export const updateSite = async (
  siteId: string,
  updates: Partial<HostedSite>
): Promise<HostedSite | null> => {
  const data = await apiFetch<HostedSite[]>(
    `/rest/v1/hosted_sites?id=eq.${siteId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
      headers: { Prefer: "return=representation" },
    }
  );
  return data?.[0] ?? null;
};

// ─── Files ───────────────────────────────────────────────────

export const fetchSiteFiles = async (siteId: string): Promise<SiteFile[]> => {
  const data = await apiFetch<SiteFile[]>(
    `/rest/v1/site_files?site_id=eq.${siteId}&order=file_path.asc&select=*`
  );
  return data ?? [];
};

export const uploadSiteFile = async (file: Partial<SiteFile>): Promise<SiteFile | null> => {
  const data = await apiFetch<SiteFile[]>(`/rest/v1/site_files`, {
    method: "POST",
    body: JSON.stringify(file),
    headers: { Prefer: "return=representation" },
  });
  return data?.[0] ?? null;
};

// ─── Payments ────────────────────────────────────────────────

export const createHostingPayment = async (
  payment: Partial<HostingPayment>
): Promise<HostingPayment | null> => {
  const data = await apiFetch<HostingPayment[]>(`/rest/v1/hosting_payments`, {
    method: "POST",
    body: JSON.stringify(payment),
    headers: { Prefer: "return=representation" },
  });
  return data?.[0] ?? null;
};

export const fetchSitePayments = async (siteId: string): Promise<HostingPayment[]> => {
  const data = await apiFetch<HostingPayment[]>(
    `/rest/v1/hosting_payments?site_id=eq.${siteId}&order=created_at.desc&select=*`
  );
  return data ?? [];
};

/** Renew a site for another 30 days. Creates a payment record and extends expires_at. */
export const renewSite = async (
  site: HostedSite,
  payerAddress: string,
  amountGyds: number,
  transactionHash?: string
): Promise<HostedSite | null> => {
  const now = new Date();
  // Extend from current expiry if still active, otherwise from now
  const baseDate = site.expires_at && new Date(site.expires_at) > now
    ? new Date(site.expires_at)
    : now;
  const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const updated = await updateSite(site.id, {
    expires_at: newExpiry.toISOString(),
    is_active: true,
  });

  if (updated) {
    await createHostingPayment({
      site_id: site.id,
      payer_address: payerAddress,
      amount_gyds: amountGyds,
      transaction_hash: transactionHash ?? null,
      period_start: now.toISOString(),
      period_end: newExpiry.toISOString(),
      status: "confirmed",
    });
  }
  return updated;
};

// ─── Custom Domains ──────────────────────────────────────────

export const fetchSiteDomains = async (siteId: string): Promise<SiteDomain[]> => {
  const data = await apiFetch<SiteDomain[]>(
    `/rest/v1/site_domains?site_id=eq.${siteId}&order=created_at.asc&select=*`
  );
  return data ?? [];
};

export const createSiteDomain = async (
  siteId: string,
  domain: string
): Promise<SiteDomain | null> => {
  const verificationToken = `gyds_verify=${siteId.slice(0, 12)}_${Date.now().toString(36)}`;
  const data = await apiFetch<SiteDomain[]>(`/rest/v1/site_domains`, {
    method: "POST",
    body: JSON.stringify({
      site_id: siteId,
      domain,
      status: "pending",
      verification_token: verificationToken,
    }),
    headers: { Prefer: "return=representation" },
  });
  return data?.[0] ?? null;
};

export const updateSiteDomain = async (
  domainId: string,
  updates: Partial<SiteDomain>
): Promise<SiteDomain | null> => {
  const data = await apiFetch<SiteDomain[]>(
    `/rest/v1/site_domains?id=eq.${domainId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
      headers: { Prefer: "return=representation" },
    }
  );
  return data?.[0] ?? null;
};

export const deleteSiteDomain = async (domainId: string): Promise<boolean> => {
  const res = await apiFetch<unknown>(`/rest/v1/site_domains?id=eq.${domainId}`, {
    method: "DELETE",
  });
  return res !== null;
};

/** Set one domain as primary, unset others on the same site (client-side coordination). */
export const setPrimaryDomain = async (
  siteId: string,
  domainId: string
): Promise<void> => {
  // Unset all primaries on this site
  await apiFetch(`/rest/v1/site_domains?site_id=eq.${siteId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_primary: false }),
  });
  // Set the chosen one
  await updateSiteDomain(domainId, { is_primary: true });
};

// ─── IPFS helpers ────────────────────────────────────────────

/** Simulate IPFS upload — replace with real Pinata/NFT.storage call */
export const uploadToIPFS = async (
  content: string | ArrayBuffer,
  filename: string
): Promise<string> => {
  // In production, this would call Pinata or NFT.storage
  // For now, generate a mock CID
  const encoder = new TextEncoder();
  const data = typeof content === "string" ? encoder.encode(content) : new Uint8Array(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `Qm${hashHex.slice(0, 44)}`;
};

/** Generate a simple HTML website template */
export const generateWebsiteTemplate = (
  siteName: string,
  ownerAddress: string
): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 600px;
    }
    h1 {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #00d4ff, #7b2ff7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
    }
    p { color: #888; line-height: 1.6; margin-bottom: 1rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: rgba(123, 47, 247, 0.2);
      border: 1px solid rgba(123, 47, 247, 0.3);
      border-radius: 999px;
      font-size: 0.75rem;
      color: #7b2ff7;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${siteName}</h1>
    <p>Welcome to my decentralized website, hosted on IPFS via GydsChain.</p>
    <p>Owner: <code>${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}</code></p>
    <div class="badge">Powered by GydsChain</div>
  </div>
</body>
</html>`;
};
