import { describe, it, expect, beforeEach } from "vitest";
import {
  SUPER_ADMIN_WALLET,
  isSuperAdmin,
  isAdminWallet,
  addAdminWallet,
  removeAdminWallet,
  getAdminWallets,
} from "@/lib/admin-auth";

const OTHER_ADMIN = "0x1111111111111111111111111111111111111111";
const RANDOM_USER = "0x2222222222222222222222222222222222222222";
const NEW_ADMIN = "0x3333333333333333333333333333333333333333";

describe("admin-auth super admin governance", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("recognises the hard-coded super admin", () => {
    expect(isSuperAdmin(SUPER_ADMIN_WALLET)).toBe(true);
    expect(isSuperAdmin(SUPER_ADMIN_WALLET.toUpperCase())).toBe(true);
    expect(isSuperAdmin(RANDOM_USER)).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
  });

  it("super admin is always in the admin list", () => {
    expect(isAdminWallet(SUPER_ADMIN_WALLET)).toBe(true);
    expect(getAdminWallets()).toContain(SUPER_ADMIN_WALLET.toLowerCase());
  });

  it("blocks non-super admins from adding admins", () => {
    expect(addAdminWallet(NEW_ADMIN, RANDOM_USER)).toBe("forbidden");
    expect(addAdminWallet(NEW_ADMIN, OTHER_ADMIN)).toBe("forbidden");
    expect(addAdminWallet(NEW_ADMIN, null)).toBe("forbidden");
    expect(isAdminWallet(NEW_ADMIN)).toBe(false);
  });

  it("allows the super admin to add a new admin", () => {
    expect(addAdminWallet(NEW_ADMIN, SUPER_ADMIN_WALLET)).toBe("ok");
    expect(isAdminWallet(NEW_ADMIN)).toBe(true);
    // duplicate add returns 'exists'
    expect(addAdminWallet(NEW_ADMIN, SUPER_ADMIN_WALLET)).toBe("exists");
  });

  it("rejects malformed addresses even for the super admin", () => {
    expect(addAdminWallet("not-an-address", SUPER_ADMIN_WALLET)).toBe("invalid");
    expect(addAdminWallet("0x123", SUPER_ADMIN_WALLET)).toBe("invalid");
  });

  it("blocks non-super admins from removing admins", () => {
    addAdminWallet(NEW_ADMIN, SUPER_ADMIN_WALLET);
    expect(removeAdminWallet(NEW_ADMIN, RANDOM_USER)).toBe("forbidden");
    expect(removeAdminWallet(NEW_ADMIN, NEW_ADMIN)).toBe("forbidden");
    expect(isAdminWallet(NEW_ADMIN)).toBe(true);
  });

  it("allows the super admin to remove runtime admins", () => {
    addAdminWallet(NEW_ADMIN, SUPER_ADMIN_WALLET);
    expect(removeAdminWallet(NEW_ADMIN, SUPER_ADMIN_WALLET)).toBe("ok");
    expect(isAdminWallet(NEW_ADMIN)).toBe(false);
  });

  it("protects the super admin from removal", () => {
    expect(removeAdminWallet(SUPER_ADMIN_WALLET, SUPER_ADMIN_WALLET)).toBe("protected");
    expect(isAdminWallet(SUPER_ADMIN_WALLET)).toBe(true);
  });
});
