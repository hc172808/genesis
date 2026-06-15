/**
 * Price alerts: localStorage-backed thresholds with toast + push triggers.
 */
import { fetchPrices, registerSymbolId } from "@/lib/price-fetcher";

const STORAGE_KEY = "gyds_price_alerts_v1";
const LOG_KEY = "gyds_price_alerts_log_v1";
const SETTINGS_KEY = "gyds_price_alerts_settings_v1";
const SYMBOLS_META_KEY = "gyds_price_alerts_symbols_v1";

export type AlertDirection = "above" | "below";
export type AlertSensitivity = "low" | "normal" | "high";

export interface PriceAlert {
  id: string;
  symbol: string;
  threshold: number;
  direction: AlertDirection;
  createdAt: number;
  triggeredAt?: number;
  active: boolean;
  /** Per-alert overrides */
  sound?: boolean;
  vibration?: boolean;
}

export interface AlertLogEntry {
  id: string;
  alertId: string;
  symbol: string;
  threshold: number;
  direction: AlertDirection;
  price: number;
  triggeredAt: number;
}

export interface AlertSettings {
  /** Global sensitivity — controls polling interval & trigger tolerance */
  sensitivity: AlertSensitivity;
  /** Master sound switch */
  sound: boolean;
  /** Master vibration switch */
  vibration: boolean;
  /** Use OS-level push notifications (requires permission) */
  push: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  sensitivity: "normal",
  sound: true,
  vibration: true,
  push: false,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

// ─── Settings ───
export function getSettings(): AlertSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<AlertSettings>>(SETTINGS_KEY, {}) };
}
export function saveSettings(s: AlertSettings) {
  write(SETTINGS_KEY, s);
}

/** Returns polling interval in ms based on sensitivity. */
export function getPollIntervalMs(): number {
  switch (getSettings().sensitivity) {
    case "high": return 5_000;
    case "low":  return 120_000;
    default:     return 30_000;
  }
}

// ─── Symbol metadata (custom symbols added by user) ───
type SymbolMeta = Record<string, { id: string; name: string }>;
export function getSymbolMeta(): SymbolMeta {
  return read<SymbolMeta>(SYMBOLS_META_KEY, {});
}
export function registerSymbolMeta(symbol: string, id: string, name: string) {
  const meta = getSymbolMeta();
  meta[symbol.toUpperCase()] = { id, name };
  write(SYMBOLS_META_KEY, meta);
  registerSymbolId(symbol, id);
}
/** Re-hydrate registered symbols into the price-fetcher map. Call on app boot. */
export function hydrateRegisteredSymbols() {
  const meta = getSymbolMeta();
  for (const [sym, { id }] of Object.entries(meta)) {
    registerSymbolId(sym, id);
  }
}

// ─── Alerts ───
export function getAlerts(): PriceAlert[] {
  return read<PriceAlert[]>(STORAGE_KEY, []);
}

export function saveAlerts(alerts: PriceAlert[]) {
  write(STORAGE_KEY, alerts);
}

export function addAlert(input: Omit<PriceAlert, "id" | "createdAt" | "active">): PriceAlert {
  const alert: PriceAlert = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    active: true,
  };
  const all = getAlerts();
  all.push(alert);
  saveAlerts(all);
  return alert;
}

export function updateAlert(id: string, patch: Partial<PriceAlert>) {
  saveAlerts(getAlerts().map((a) => (a.id === id ? { ...a, ...patch } : a)));
}

export function removeAlert(id: string) {
  saveAlerts(getAlerts().filter((a) => a.id !== id));
}

export function toggleAlert(id: string) {
  saveAlerts(
    getAlerts().map((a) => (a.id === id ? { ...a, active: !a.active } : a))
  );
}

// ─── Log ───
export function getLog(): AlertLogEntry[] {
  return read<AlertLogEntry[]>(LOG_KEY, []);
}
export function clearLog() {
  write(LOG_KEY, []);
}
function appendLog(entry: AlertLogEntry) {
  const log = getLog();
  log.unshift(entry);
  write(LOG_KEY, log.slice(0, 100));
}

// ─── Notifications (OS push) ───
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try { return await Notification.requestPermission(); } catch { return "denied"; }
}

export function canPushNotify(): boolean {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

export function pushNotify(title: string, body: string) {
  if (!canPushNotify()) return;
  try {
    new Notification(title, { body, icon: "/pwa-192x192.png", badge: "/pwa-192x192.png", tag: "gyds-alert" });
  } catch { /* ignore */ }
}

// ─── Feedback (sound + vibration) ───
let _audioCtx: AudioContext | null = null;
function getAudio(): AudioContext | null {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return _audioCtx;
  } catch { return null; }
}
export function playAlertSound() {
  const ctx = getAudio();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(1320, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.42);
  } catch { /* ignore */ }
}
export function vibrate(pattern: number | number[] = [120, 60, 120]) {
  try { (navigator as any).vibrate?.(pattern); } catch { /* ignore */ }
}

// ─── Export / Import ───
export interface AlertsBackup {
  version: 2;
  exportedAt: number;
  alerts: PriceAlert[];
  settings: AlertSettings;
  symbols: SymbolMeta;
}

export function exportAlerts(): AlertsBackup {
  return {
    version: 2,
    exportedAt: Date.now(),
    alerts: getAlerts(),
    settings: getSettings(),
    symbols: getSymbolMeta(),
  };
}

export function importAlerts(json: string, mode: "merge" | "replace" = "merge"): {
  imported: number; total: number;
} {
  const parsed = JSON.parse(json) as Partial<AlertsBackup>;
  if (!parsed || !Array.isArray(parsed.alerts)) {
    throw new Error("Invalid backup file");
  }
  // Symbols
  if (parsed.symbols) {
    const cur = mode === "replace" ? {} : getSymbolMeta();
    for (const [sym, meta] of Object.entries(parsed.symbols)) {
      cur[sym] = meta;
      registerSymbolId(sym, meta.id);
    }
    write(SYMBOLS_META_KEY, cur);
  }
  // Settings
  if (parsed.settings) saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
  // Alerts
  const incoming = parsed.alerts.filter((a) => a && a.symbol && typeof a.threshold === "number");
  let next: PriceAlert[];
  if (mode === "replace") {
    next = incoming;
  } else {
    const existing = getAlerts();
    const seen = new Set(existing.map((a) => `${a.symbol}|${a.direction}|${a.threshold}`));
    const dedup = incoming.filter((a) => !seen.has(`${a.symbol}|${a.direction}|${a.threshold}`));
    next = [...existing, ...dedup];
  }
  saveAlerts(next);
  return { imported: incoming.length, total: next.length };
}

/**
 * Check all active alerts against current prices.
 * Returns array of newly-triggered alerts.
 */
export async function checkAlerts(): Promise<AlertLogEntry[]> {
  const alerts = getAlerts();
  const active = alerts.filter((a) => a.active && !a.triggeredAt);
  if (active.length === 0) return [];

  const symbols = [...new Set(active.map((a) => a.symbol.toUpperCase()))];
  const prices = await fetchPrices(symbols);

  const settings = getSettings();
  const triggered: AlertLogEntry[] = [];
  const updated = alerts.map((a) => {
    if (!a.active || a.triggeredAt) return a;
    const p = prices[a.symbol.toUpperCase()];
    if (!p) return a;
    const hit =
      (a.direction === "above" && p.usd >= a.threshold) ||
      (a.direction === "below" && p.usd <= a.threshold);
    if (!hit) return a;

    const entry: AlertLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      alertId: a.id,
      symbol: a.symbol,
      threshold: a.threshold,
      direction: a.direction,
      price: p.usd,
      triggeredAt: Date.now(),
    };
    triggered.push(entry);
    appendLog(entry);

    // Feedback (per-alert overrides global)
    const wantSound = (a.sound ?? settings.sound);
    const wantVibe  = (a.vibration ?? settings.vibration);
    if (wantSound) playAlertSound();
    if (wantVibe) vibrate();
    if (settings.push) pushNotify(
      `${a.symbol} ${a.direction} ${a.threshold}`,
      `Now trading at $${p.usd}`
    );

    return { ...a, triggeredAt: entry.triggeredAt, active: false };
  });

  if (triggered.length > 0) saveAlerts(updated);
  return triggered;
}
