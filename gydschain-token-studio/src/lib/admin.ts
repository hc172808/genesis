/**
 * Shared admin authorization helper.
 * Replicates the logic from Admin.tsx so other pages (PoolTest, etc.)
 * can gate to admin wallets without duplicating the env-var parsing.
 */

const ADMIN_WALLETS: string[] = (() => {
  const envWallets = import.meta.env.VITE_ADMIN_WALLETS;
  if (envWallets && typeof envWallets === "string") {
    return envWallets.split(",").map((w: string) => w.trim()).filter(Boolean);
  }
  return ["0x6422d12bfaddee5142bfad21b3006a74d09017b1", "0x7a3B...9f4E"];
})();

export const isAdminWallet = (address: string | null | undefined): boolean => {
  if (!address) return false;
  return ADMIN_WALLETS.some((admin) => {
    if (admin.toLowerCase() === address.toLowerCase()) return true;
    const shortMatch = admin.match(/^(0x[a-fA-F0-9]{4})\.{3}([a-fA-F0-9]{4})$/);
    if (shortMatch) {
      return (
        address.toLowerCase().startsWith(shortMatch[1].toLowerCase()) &&
        address.toLowerCase().endsWith(shortMatch[2].toLowerCase())
      );
    }
    return false;
  });
};

export const getAdminWallets = (): string[] => [...ADMIN_WALLETS];
