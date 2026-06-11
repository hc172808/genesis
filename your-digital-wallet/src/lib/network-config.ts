import { z } from "zod";

export interface NetworkConfig {
  name: string;
  symbol: string;
  chainId: number;
  chainIdHex: string;
  decimals: number;
  blockExplorer: string;
  rpcUrls: string[];
}

// Validation schemas for admin inputs
const rpcUrlSchema = z.string().url("Invalid URL").max(200);
const networkNameSchema = z.string().trim().min(1).max(50);

const DEFAULT_RPC_URLS = [
  "https://rpc.netlifegy.com",
  "https://rpc2.netlifegy.com",
  "https://rpc3.netlifegy.com",
  "https://localhost:8546",
  "https://192.168.18.106:8546",
];

const STORAGE_KEY = "gyds_network_config";
const ADMIN_KEY = "gyds_admin_hash";
const ADMIN_SALT_KEY = "gyds_admin_salt";

export const getDefaultNetwork = (): NetworkConfig => ({
  name: "GYDS Network",
  symbol: "GYDS",
  chainId: 13370,
  chainIdHex: "0x343A",
  decimals: 18,
  blockExplorer: "https://explorer.netlifegy.com",
  rpcUrls: DEFAULT_RPC_URLS,
});

export const getNetworkConfig = (): NetworkConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...getDefaultNetwork(), ...parsed };
    }
  } catch {
    // fallback to default
  }
  return getDefaultNetwork();
};

export const saveNetworkConfig = (config: NetworkConfig): void => {
  // Validate RPC URLs before saving
  const validUrls = config.rpcUrls.filter((url) => {
    try { rpcUrlSchema.parse(url); return true; } catch { return false; }
  });
  if (validUrls.length === 0) throw new Error("Must have at least one valid RPC URL");
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, rpcUrls: validUrls }));
};

export const validateRpcUrl = (url: string): boolean => {
  try { rpcUrlSchema.parse(url); return true; } catch { return false; }
};

// Salted password hashing with PBKDF2 for admin
const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const hashPasswordWithSalt = async (password: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const isAdminSetup = (): boolean => {
  return !!localStorage.getItem(ADMIN_KEY);
};

export const setupAdmin = async (password: string): Promise<void> => {
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  const salt = generateSalt();
  const hash = await hashPasswordWithSalt(password, salt);
  localStorage.setItem(ADMIN_SALT_KEY, salt);
  localStorage.setItem(ADMIN_KEY, hash);
};

export const verifyAdmin = async (password: string): Promise<boolean> => {
  const storedHash = localStorage.getItem(ADMIN_KEY);
  const salt = localStorage.getItem(ADMIN_SALT_KEY);
  if (!storedHash || !salt) return false;
  const hash = await hashPasswordWithSalt(password, salt);
  // Constant-time comparison
  if (hash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
};

export const getActiveRpc = async (): Promise<string | null> => {
  const config = getNetworkConfig();
  for (const url of config.rpcUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) return url;
    } catch {
      continue;
    }
  }
  return config.rpcUrls[0];
};

export const APP_VERSION = "1.4.0";
