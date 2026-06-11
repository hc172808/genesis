import { z } from "zod";

const TX_HISTORY_KEY = "gyds_tx_history";
const MAX_TRANSACTIONS = 500;

export interface Transaction {
  id: string;
  type: "sent" | "received" | "swap";
  symbol: string;
  amount: string;
  toAddress?: string;
  fromAddress?: string;
  txHash: string;
  timestamp: number;
  status: "confirmed" | "pending" | "failed";
}

const transactionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["sent", "received", "swap"]),
  symbol: z.string().min(1).max(20),
  amount: z.string().min(1),
  toAddress: z.string().optional(),
  fromAddress: z.string().optional(),
  txHash: z.string().min(1),
  timestamp: z.number().positive(),
  status: z.enum(["confirmed", "pending", "failed"]),
});

export const getTransactionHistory = (): Transaction[] => {
  try {
    const stored = localStorage.getItem(TX_HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tx: unknown) => transactionSchema.safeParse(tx).success);
  } catch {
    return [];
  }
};

export const saveTransaction = (tx: Omit<Transaction, "id">): Transaction => {
  const fullTx: Transaction = {
    ...tx,
    id: `${tx.timestamp}-${Math.random().toString(36).slice(2, 10)}`,
  };
  transactionSchema.parse(fullTx);

  const history = getTransactionHistory();
  history.unshift(fullTx);
  if (history.length > MAX_TRANSACTIONS) history.length = MAX_TRANSACTIONS;
  localStorage.setItem(TX_HISTORY_KEY, JSON.stringify(history));
  return fullTx;
};

export const clearTransactionHistory = (): void => {
  localStorage.removeItem(TX_HISTORY_KEY);
};

export const formatTxDate = (ts: number): string => {
  return new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
};

export const formatTxTime = (ts: number): string => {
  return new Date(ts).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
};

export const shortAddress = (addr: string): string => {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};
