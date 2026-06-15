/**
 * Hosting checklist — best-effort client-side probes that turn each item in
 * the Admin → Hosting tab green / red / amber.
 *
 * Some checks (firewall, fail2ban) cannot be verified from the browser; for
 * those we return `"manual"` with the command the operator should run.
 */

import { getNetworkConfig } from "@/lib/network-config";

export type CheckStatus = "pass" | "fail" | "manual" | "unknown";

export interface HostingCheck {
  id: string;
  title: string;
  detail: string;
  status: CheckStatus;
  hint?: string;
}

const env = (k: string): string => (import.meta.env[k as keyof ImportMetaEnv] as string | undefined) || "";

async function checkSecurityHeaders(): Promise<{ ok: boolean; missing: string[] }> {
  try {
    const res = await fetch(window.location.origin + "/", { method: "HEAD", cache: "no-store" });
    const required = ["x-frame-options", "x-content-type-options", "referrer-policy"];
    const missing = required.filter((h) => !res.headers.get(h));
    return { ok: missing.length === 0, missing };
  } catch {
    return { ok: false, missing: ["(fetch failed)"] };
  }
}

async function checkServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length > 0;
  } catch {
    return false;
  }
}

export async function runHostingChecks(): Promise<HostingCheck[]> {
  const results: HostingCheck[] = [];

  // 1. TLS
  const isHttps = window.location.protocol === "https:";
  results.push({
    id: "tls",
    title: "TLS (HTTPS)",
    detail: isHttps ? "Site loaded over HTTPS." : "Site is on plain HTTP. Run `scripts/harden.sh` to issue a Let's Encrypt cert.",
    status: isHttps ? "pass" : "fail",
    hint: !isHttps ? "sudo DOMAIN=… EMAIL=… bash scripts/harden.sh" : undefined,
  });

  // 2. Security headers
  const hdr = await checkSecurityHeaders();
  results.push({
    id: "headers",
    title: "nginx security headers",
    detail: hdr.ok ? "X-Frame-Options, X-Content-Type-Options and Referrer-Policy present." : `Missing: ${hdr.missing.join(", ")}`,
    status: hdr.ok ? "pass" : "fail",
    hint: !hdr.ok ? "Re-run scripts/harden.sh to install the production nginx vhost." : undefined,
  });

  // 3. Admin wallets configured
  const admins = env("VITE_ADMIN_WALLETS").split(",").filter((w) => w.trim().startsWith("0x"));
  results.push({
    id: "admins",
    title: "Admin wallets",
    detail: admins.length > 0 ? `${admins.length} admin wallet(s) configured via VITE_ADMIN_WALLETS.` : "No env-defined admins — only the hard-coded super admin can manage the panel.",
    status: admins.length > 0 ? "pass" : "unknown",
    hint: admins.length === 0 ? "Set VITE_ADMIN_WALLETS=0x…,0x… in .env" : undefined,
  });

  // 4. RPC endpoints
  const cfg = getNetworkConfig();
  results.push({
    id: "rpc",
    title: "RPC endpoints",
    detail: cfg.rpcUrls.length > 0 ? `${cfg.rpcUrls.length} GYDS RPC URL(s) configured.` : "No RPCs configured — wallet will not load balances.",
    status: cfg.rpcUrls.length > 0 ? "pass" : "fail",
  });

  // 5. Service worker
  const sw = await checkServiceWorker();
  results.push({
    id: "sw",
    title: "Service worker registered",
    detail: sw ? "PWA service worker is active (offline + push alerts available)." : "No SW registered — install the PWA from the address bar to enable background alerts.",
    status: sw ? "pass" : "unknown",
  });

  // 6. Firewall — cannot probe from browser
  results.push({
    id: "ufw",
    title: "ufw firewall",
    detail: "Cannot detect from browser. Verify on the server.",
    status: "manual",
    hint: "sudo ufw status verbose",
  });

  // 7. fail2ban — cannot probe from browser
  results.push({
    id: "fail2ban",
    title: "fail2ban",
    detail: "Cannot detect from browser. Verify on the server.",
    status: "manual",
    hint: "sudo fail2ban-client status",
  });

  // 8. unattended-upgrades — manual
  results.push({
    id: "updates",
    title: "Automatic security updates",
    detail: "Cannot detect from browser. Verify unattended-upgrades is active.",
    status: "manual",
    hint: "sudo systemctl status unattended-upgrades",
  });

  return results;
}
