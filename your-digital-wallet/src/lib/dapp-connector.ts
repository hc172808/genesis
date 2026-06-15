/**
 * dApp Connector — manages connected dApps, session persistence,
 * and the injected provider interface.
 */

const SESSIONS_KEY = "gyds_dapp_sessions";

export interface DAppSession {
  origin: string;
  name: string;
  icon?: string;
  connectedAt: number;
  lastActive: number;
  permissions: string[];
}

export interface PendingRequest {
  id: number;
  method: string;
  params: unknown[];
  origin: string;
  timestamp: number;
}

// ── Session Management ──────────────────────────────────

export const getSessions = (): DAppSession[] => {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

export const getSession = (origin: string): DAppSession | undefined => {
  return getSessions().find((s) => s.origin === origin);
};

export const saveSession = (session: DAppSession): void => {
  const sessions = getSessions().filter((s) => s.origin !== session.origin);
  sessions.unshift(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

export const removeSession = (origin: string): void => {
  const sessions = getSessions().filter((s) => s.origin !== origin);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

export const clearAllSessions = (): void => {
  localStorage.removeItem(SESSIONS_KEY);
};

// ── Pending Request Queue (for approval UI) ─────────────

let pendingRequests: PendingRequest[] = [];
let requestListeners: Array<() => void> = [];
let nextRequestId = 1;

export const addPendingRequest = (
  method: string,
  params: unknown[],
  origin: string
): number => {
  const id = nextRequestId++;
  pendingRequests.push({ id, method, params, origin, timestamp: Date.now() });
  notifyListeners();
  return id;
};

export const getPendingRequests = (): PendingRequest[] => [...pendingRequests];

export const removePendingRequest = (id: number): void => {
  pendingRequests = pendingRequests.filter((r) => r.id !== id);
  notifyListeners();
};

export const onPendingRequestsChange = (listener: () => void): (() => void) => {
  requestListeners.push(listener);
  return () => {
    requestListeners = requestListeners.filter((l) => l !== listener);
  };
};

const notifyListeners = () => requestListeners.forEach((l) => l());

// ── Decode common methods for human-readable display ────

export const decodeMethod = (method: string): { label: string; risk: "low" | "medium" | "high" } => {
  const map: Record<string, { label: string; risk: "low" | "medium" | "high" }> = {
    eth_requestAccounts: { label: "Connect Wallet", risk: "low" },
    eth_accounts: { label: "View Accounts", risk: "low" },
    eth_chainId: { label: "Check Network", risk: "low" },
    net_version: { label: "Check Network", risk: "low" },
    personal_sign: { label: "Sign Message", risk: "medium" },
    eth_sign: { label: "Sign Message (Unsafe)", risk: "high" },
    eth_signTypedData_v4: { label: "Sign Typed Data", risk: "medium" },
    eth_sendTransaction: { label: "Send Transaction", risk: "high" },
    wallet_switchEthereumChain: { label: "Switch Network", risk: "low" },
    wallet_addEthereumChain: { label: "Add Network", risk: "medium" },
  };
  return map[method] || { label: method, risk: "medium" };
};

// ── Format transaction for display ──────────────────────

export const formatTransactionForDisplay = (params: unknown[]): {
  to: string;
  value: string;
  data: string;
  isContractCall: boolean;
} => {
  const tx = (params[0] || {}) as Record<string, string>;
  const value = tx.value ? (parseInt(tx.value, 16) / 1e18).toFixed(6) : "0";
  const data = tx.data || "0x";
  return {
    to: tx.to || "Unknown",
    value,
    data: data.length > 10 ? `${data.slice(0, 10)}...` : data,
    isContractCall: data.length > 2,
  };
};
