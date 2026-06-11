// Auto-lock session system — locks wallet after idle timeout

const LOCK_KEY = "gyds_session_locked";
const LAST_ACTIVITY_KEY = "gyds_last_activity";
const AUTO_LOCK_MS_KEY = "gyds_auto_lock_ms";

const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const getAutoLockTimeout = (): number => {
  const stored = localStorage.getItem(AUTO_LOCK_MS_KEY);
  return stored ? parseInt(stored, 10) : DEFAULT_TIMEOUT;
};

export const setAutoLockTimeout = (ms: number): void => {
  localStorage.setItem(AUTO_LOCK_MS_KEY, String(ms));
};

export const isSessionLocked = (): boolean => {
  const locked = localStorage.getItem(LOCK_KEY);
  if (locked === "true") return true;
  const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10);
  if (lastActivity > 0 && Date.now() - lastActivity > getAutoLockTimeout()) {
    lockSession();
    return true;
  }
  return false;
};

export const lockSession = (): void => {
  localStorage.setItem(LOCK_KEY, "true");
};

export const unlockSession = (): void => {
  localStorage.setItem(LOCK_KEY, "false");
  recordActivity();
};

export const recordActivity = (): void => {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
};

// Auto-lock timeout options for settings UI
export const AUTO_LOCK_OPTIONS = [
  { label: "1 minute", ms: 60_000 },
  { label: "5 minutes", ms: 300_000 },
  { label: "15 minutes", ms: 900_000 },
  { label: "30 minutes", ms: 1_800_000 },
  { label: "1 hour", ms: 3_600_000 },
  { label: "Never", ms: Infinity },
];
