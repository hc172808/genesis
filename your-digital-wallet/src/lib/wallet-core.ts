import { ethers } from "ethers";
import { z } from "zod";

const WALLET_KEY = "gyds_wallet_encrypted";
const WALLET_ADDR_KEY = "gyds_wallet_address";
const BALANCE_HISTORY_KEY = "gyds_balance_history";
const UNLOCK_ATTEMPTS_KEY = "gyds_unlock_attempts";
const LOCKOUT_KEY = "gyds_lockout_until";

export interface WalletData {
  address: string;
  encryptedJson: string;
}

export interface BalanceSnapshot {
  timestamp: number;
  usd: number;
}

// ─── Validation schemas ───
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long");
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");
const mnemonicSchema = z.string().refine((val) => {
  const words = val.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
}, "Must be 12 or 24 words");
const privateKeySchema = z.string().refine((val) => {
  const key = val.startsWith("0x") ? val.slice(2) : val;
  return /^[a-fA-F0-9]{64}$/.test(key);
}, "Invalid private key format");
const amountSchema = z.string().refine((val) => {
  const num = parseFloat(val);
  return !isNaN(num) && num > 0 && num < 1e18;
}, "Invalid amount");

export { addressSchema, amountSchema, passwordSchema };

// ─── Rate limiting for unlock attempts ───
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 300000; // 5 minutes

const getUnlockAttempts = (): number => {
  return parseInt(localStorage.getItem(UNLOCK_ATTEMPTS_KEY) || "0", 10);
};

const getLockoutUntil = (): number => {
  return parseInt(localStorage.getItem(LOCKOUT_KEY) || "0", 10);
};

const recordFailedAttempt = (): { locked: boolean; remainingSeconds: number } => {
  const attempts = getUnlockAttempts() + 1;
  localStorage.setItem(UNLOCK_ATTEMPTS_KEY, String(attempts));
  if (attempts >= MAX_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem(LOCKOUT_KEY, String(until));
    return { locked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION / 1000) };
  }
  return { locked: false, remainingSeconds: 0 };
};

const resetAttempts = (): void => {
  localStorage.removeItem(UNLOCK_ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_KEY);
};

export const checkLockout = (): { locked: boolean; remainingSeconds: number } => {
  const until = getLockoutUntil();
  if (until > Date.now()) {
    return { locked: true, remainingSeconds: Math.ceil((until - Date.now()) / 1000) };
  }
  if (until > 0) {
    // Lockout expired, reset
    resetAttempts();
  }
  return { locked: false, remainingSeconds: 0 };
};

// ─── Core wallet functions ───

export const hasWallet = (): boolean => {
  return !!localStorage.getItem(WALLET_KEY);
};

export const getWalletAddress = (): string | null => {
  return localStorage.getItem(WALLET_ADDR_KEY);
};

export const createWallet = async (password: string): Promise<{ address: string; mnemonic: string }> => {
  passwordSchema.parse(password);
  
  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic?.phrase;
  if (!mnemonic) throw new Error("Failed to generate mnemonic");

  const encrypted = await wallet.encrypt(password);
  localStorage.setItem(WALLET_KEY, encrypted);
  localStorage.setItem(WALLET_ADDR_KEY, wallet.address);

  return { address: wallet.address, mnemonic };
};

export const importFromMnemonic = async (mnemonic: string, password: string): Promise<string> => {
  mnemonicSchema.parse(mnemonic);
  passwordSchema.parse(password);
  
  const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
  const encrypted = await wallet.encrypt(password);
  localStorage.setItem(WALLET_KEY, encrypted);
  localStorage.setItem(WALLET_ADDR_KEY, wallet.address);
  return wallet.address;
};

export const importFromPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  privateKeySchema.parse(privateKey);
  passwordSchema.parse(password);
  
  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(key);
  const encrypted = await wallet.encrypt(password);
  localStorage.setItem(WALLET_KEY, encrypted);
  localStorage.setItem(WALLET_ADDR_KEY, wallet.address);
  return wallet.address;
};

export const unlockWallet = async (password: string): Promise<ethers.Wallet> => {
  // Check rate limiting
  const lockStatus = checkLockout();
  if (lockStatus.locked) {
    throw new Error(`Too many attempts. Locked for ${lockStatus.remainingSeconds}s`);
  }

  const encrypted = localStorage.getItem(WALLET_KEY);
  if (!encrypted) throw new Error("No wallet found");
  
  try {
    const wallet = await (ethers.Wallet.fromEncryptedJson(encrypted, password) as Promise<ethers.Wallet>);
    resetAttempts(); // Success → reset counter
    return wallet;
  } catch (err) {
    const result = recordFailedAttempt();
    if (result.locked) {
      throw new Error(`Wrong password. Wallet locked for ${result.remainingSeconds}s`);
    }
    const remaining = MAX_ATTEMPTS - getUnlockAttempts();
    throw new Error(`Wrong password. ${remaining} attempts remaining`);
  }
};

export const exportPrivateKey = async (password: string): Promise<string> => {
  const wallet = await unlockWallet(password);
  return wallet.privateKey;
};

export const exportMnemonic = async (password: string): Promise<string | null> => {
  const wallet = await unlockWallet(password);
  return (wallet as any).mnemonic?.phrase || null;
};

export const deleteWallet = (): void => {
  localStorage.removeItem(WALLET_KEY);
  localStorage.removeItem(WALLET_ADDR_KEY);
  localStorage.removeItem(BALANCE_HISTORY_KEY);
  resetAttempts();
};

// ─── Balance history ───

export const saveBalanceSnapshot = (usd: number): void => {
  if (!isFinite(usd) || usd < 0) return;
  const history = getBalanceHistory();
  const now = Date.now();
  // Save one snapshot per 5 minutes for fresh wallets, per hour otherwise
  const minInterval = history.length < 50 ? 300000 : 3600000;
  const lastEntry = history[history.length - 1];
  if (lastEntry && now - lastEntry.timestamp < minInterval) return;

  history.push({ timestamp: now, usd: parseFloat(usd.toFixed(2)) });
  if (history.length > 365) history.splice(0, history.length - 365);
  localStorage.setItem(BALANCE_HISTORY_KEY, JSON.stringify(history));
};

export const getBalanceHistory = (): BalanceSnapshot[] => {
  try {
    const stored = localStorage.getItem(BALANCE_HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Validate structure
    return parsed.filter((s: any) => typeof s.timestamp === "number" && typeof s.usd === "number");
  } catch {
    return [];
  }
};

// ─── RPC error parser ───

export const parseRpcError = (err: unknown): string => {
  const msg: string = (err as any)?.message ?? String(err);

  if (/insufficient funds/i.test(msg))          return "Insufficient balance to cover amount + gas fee.";
  if (/nonce too low/i.test(msg))               return "Transaction nonce conflict — try again in a moment.";
  if (/replacement.*underpriced/i.test(msg))    return "Gas price too low to replace pending tx.";
  if (/gas.*required.*exceeds/i.test(msg))      return "Gas limit too low — the transaction would run out of gas.";
  if (/execution reverted/i.test(msg)) {
    const reason = msg.match(/reason="([^"]+)"/)?.[1] ?? msg.match(/revert (.+)/i)?.[1];
    return reason ? `Contract reverted: ${reason}` : "Contract execution reverted.";
  }
  if (/user denied|user rejected/i.test(msg))   return "Transaction rejected by user.";
  if (/network.*changed/i.test(msg))            return "Network changed mid-transaction — please retry.";
  if (/timeout|timed out/i.test(msg))           return "RPC request timed out — try a different endpoint.";
  if (/invalid password|incorrect/i.test(msg))  return "Wrong wallet password.";
  if (/locked/i.test(msg))                       return msg;

  // Strip noisy ethers.js prefixes
  return msg.replace(/^Error:\s*/i, "").slice(0, 120);
};

// ─── Balance helpers ───

export const fetchBalance = async (address: string, rpcUrl: string): Promise<string> => {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1 }),
  });
  const data = await res.json();
  if (!data?.result) return "0";
  const wei = BigInt(data.result);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
};

export const fetchTokenBalance = async (
  address: string,
  tokenAddress: string,
  decimals: number,
  rpcUrl: string
): Promise<string> => {
  const iface = new ethers.Interface(["function balanceOf(address) view returns (uint256)"]);
  const data = iface.encodeFunctionData("balanceOf", [address]);
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "eth_call",
      params: [{ to: tokenAddress, data }, "latest"], id: 1,
    }),
  });
  const json = await res.json();
  if (!json?.result || json.result === "0x") return "0";
  const raw = BigInt(json.result);
  const val = Number(raw) / Math.pow(10, decimals);
  return val.toFixed(decimals > 6 ? 6 : decimals);
};

// ─── Message signing ───

export const personalSign = async (password: string, message: string): Promise<string> => {
  const wallet = await unlockWallet(password);
  return wallet.signMessage(message);
};

export const signTypedData = async (
  password: string,
  domain: ethers.TypedDataDomain,
  types: Record<string, ethers.TypedDataField[]>,
  value: Record<string, unknown>
): Promise<string> => {
  const wallet = await unlockWallet(password);
  return wallet.signTypedData(domain, types, value);
};

// ─── Transaction functions ───

export const sendNativeTransaction = async (
  wallet: ethers.Wallet,
  to: string,
  amountEther: string,
  rpcUrl: string
): Promise<string> => {
  addressSchema.parse(to);
  amountSchema.parse(amountEther);
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = wallet.connect(provider);
  const tx = await signer.sendTransaction({
    to,
    value: ethers.parseEther(amountEther),
  });
  return tx.hash;
};

export const sendERC20Transaction = async (
  wallet: ethers.Wallet,
  tokenAddress: string,
  to: string,
  amount: string,
  decimals: number,
  rpcUrl: string
): Promise<string> => {
  addressSchema.parse(to);
  addressSchema.parse(tokenAddress);
  amountSchema.parse(amount);
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = wallet.connect(provider);
  const iface = new ethers.Interface(["function transfer(address to, uint256 amount) returns (bool)"]);
  const data = iface.encodeFunctionData("transfer", [to, ethers.parseUnits(amount, decimals)]);
  const tx = await signer.sendTransaction({ to: tokenAddress, data });
  return tx.hash;
};
