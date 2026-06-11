/**
 * Admin authentication via wallet address.
 *
 * - Admin wallets are defined in VITE_ADMIN_WALLETS env (comma-separated)
 *   plus runtime additions made by the SUPER ADMIN inside the panel.
 * - The SUPER ADMIN is hard-coded and is the ONLY wallet allowed to add or
 *   remove other admins. Regular admins can still access the panel but
 *   cannot mutate the admin list.
 */

const ENV_ADMIN_WALLETS = import.meta.env.VITE_ADMIN_WALLETS || "";
const RUNTIME_ADMINS_KEY = "gyds_runtime_admins";

/** The single super-admin wallet (hard-coded). */
export const SUPER_ADMIN_WALLET =
  "0x6422D12BFADdEE5142BFaD21b3006a74D09017B1".toLowerCase();

export const isSuperAdmin = (address: string | null | undefined): boolean => {
  if (!address) return false;
  return address.toLowerCase() === SUPER_ADMIN_WALLET;
};

/** Get all admin wallet addresses (env + runtime + hard-coded super admin) */
export const getAdminWallets = (): string[] => {
  const envWallets = ENV_ADMIN_WALLETS
    .split(",")
    .map((w: string) => w.trim().toLowerCase())
    .filter((w: string) => w.startsWith("0x") && w.length === 42);

  const runtimeWallets = getRuntimeAdmins();
  const all = new Set([SUPER_ADMIN_WALLET, ...envWallets, ...runtimeWallets]);
  return Array.from(all);
};

/** Check if a wallet address is an admin */
export const isAdminWallet = (address: string | null): boolean => {
  if (!address) return false;
  const admins = getAdminWallets();
  return admins.includes(address.toLowerCase());
};

/** Get runtime-added admin wallets (added by super admin via the panel) */
const getRuntimeAdmins = (): string[] => {
  try {
    const stored = localStorage.getItem(RUNTIME_ADMINS_KEY);
    if (!stored) return [];
    return JSON.parse(stored).filter(
      (w: string) => typeof w === "string" && w.startsWith("0x") && w.length === 42
    );
  } catch {
    return [];
  }
};

/**
 * Add a new admin wallet. Only the SUPER ADMIN may call this.
 * Returns:
 *   - "ok"           : added
 *   - "exists"       : already an admin
 *   - "invalid"      : malformed address
 *   - "forbidden"    : caller is not the super admin
 */
export const addAdminWallet = (
  address: string,
  caller: string | null,
): "ok" | "exists" | "invalid" | "forbidden" => {
  if (!isSuperAdmin(caller)) return "forbidden";
  const normalized = address.trim().toLowerCase();
  if (!normalized.startsWith("0x") || normalized.length !== 42) return "invalid";

  const all = getAdminWallets();
  if (all.includes(normalized)) return "exists";

  const current = getRuntimeAdmins();
  current.push(normalized);
  localStorage.setItem(RUNTIME_ADMINS_KEY, JSON.stringify(current));
  return "ok";
};

/**
 * Remove a runtime admin wallet. Only the SUPER ADMIN may call this.
 * The super admin and env-defined admins cannot be removed.
 */
export const removeAdminWallet = (
  address: string,
  caller: string | null,
): "ok" | "protected" | "forbidden" | "not-found" => {
  if (!isSuperAdmin(caller)) return "forbidden";
  const normalized = address.toLowerCase();
  if (normalized === SUPER_ADMIN_WALLET) return "protected";
  if (isEnvAdmin(normalized)) return "protected";

  const current = getRuntimeAdmins();
  if (!current.includes(normalized)) return "not-found";
  const updated = current.filter((w) => w !== normalized);
  localStorage.setItem(RUNTIME_ADMINS_KEY, JSON.stringify(updated));
  return "ok";
};

/** Check if an admin wallet is from env (non-removable) */
export const isEnvAdmin = (address: string): boolean => {
  return ENV_ADMIN_WALLETS
    .split(",")
    .map((w: string) => w.trim().toLowerCase())
    .includes(address.toLowerCase());
};
