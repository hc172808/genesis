// Multi-account support — derive accounts from HD seed (BIP44)
import { ethers } from "ethers";

const ACCOUNTS_KEY = "gyds_accounts";
const ACTIVE_ACCOUNT_KEY = "gyds_active_account";

export interface DerivedAccount {
  index: number;
  address: string;
  name: string;
}

export const getAccounts = (): DerivedAccount[] => {
  try {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const getActiveAccountIndex = (): number => {
  return parseInt(localStorage.getItem(ACTIVE_ACCOUNT_KEY) || "0", 10);
};

export const setActiveAccount = (index: number): void => {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(index));
  // Update the main wallet address key so all components use it
  const accounts = getAccounts();
  const account = accounts.find((a) => a.index === index);
  if (account) {
    localStorage.setItem("gyds_wallet_address", account.address);
  }
};

export const deriveAccounts = async (
  mnemonic: string,
  count: number
): Promise<DerivedAccount[]> => {
  const accounts: DerivedAccount[] = [];
  for (let i = 0; i < count; i++) {
    const path = `m/44'/60'/0'/0/${i}`;
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);
    accounts.push({
      index: i,
      address: wallet.address,
      name: i === 0 ? "Main Account" : `Account ${i + 1}`,
    });
  }
  return accounts;
};

export const addNewAccount = async (mnemonic: string): Promise<DerivedAccount> => {
  const existing = getAccounts();
  const nextIndex = existing.length;
  const path = `m/44'/60'/0'/0/${nextIndex}`;
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);
  const account: DerivedAccount = {
    index: nextIndex,
    address: wallet.address,
    name: `Account ${nextIndex + 1}`,
  };
  existing.push(account);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(existing));
  return account;
};

export const renameAccount = (index: number, name: string): void => {
  const accounts = getAccounts();
  const acc = accounts.find((a) => a.index === index);
  if (acc) {
    acc.name = name.trim().slice(0, 30) || `Account ${index + 1}`;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
};

export const initializeAccounts = (address: string): void => {
  const accounts = getAccounts();
  if (accounts.length === 0) {
    localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify([{ index: 0, address, name: "Main Account" }])
    );
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "0");
  }
};
