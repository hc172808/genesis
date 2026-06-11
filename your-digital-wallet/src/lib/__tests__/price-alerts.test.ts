import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock the price fetcher BEFORE importing the module under test
vi.mock("@/lib/price-fetcher", () => ({
  fetchPrices: vi.fn(),
  registerSymbolId: vi.fn(),
  formatPrice: (n: number) => `$${n}`,
}));

import {
  addAlert, getAlerts, getLog, checkAlerts, saveAlerts, exportAlerts, importAlerts,
  getPollIntervalMs, saveSettings, getSettings,
  playAlertSound, vibrate, pushNotify, requestNotificationPermission, canPushNotify,
} from "@/lib/price-alerts";
import { fetchPrices } from "@/lib/price-fetcher";

const mockedFetchPrices = vi.mocked(fetchPrices);

beforeEach(() => {
  localStorage.clear();
  mockedFetchPrices.mockReset();
});

describe("price-alerts: trigger logic", () => {
  it("triggers an 'above' alert when price >= threshold and writes a log entry", async () => {
    addAlert({ symbol: "BTC", direction: "above", threshold: 50000 });
    mockedFetchPrices.mockResolvedValueOnce({ BTC: { usd: 51000, usd_24h_change: 0 } as any });

    const triggered = await checkAlerts();

    expect(triggered).toHaveLength(1);
    expect(triggered[0].symbol).toBe("BTC");
    expect(triggered[0].price).toBe(51000);
    const stored = getAlerts();
    expect(stored[0].triggeredAt).toBeTruthy();
    expect(stored[0].active).toBe(false);
    expect(getLog()).toHaveLength(1);
  });

  it("triggers a 'below' alert when price <= threshold", async () => {
    addAlert({ symbol: "ETH", direction: "below", threshold: 2000 });
    mockedFetchPrices.mockResolvedValueOnce({ ETH: { usd: 1999, usd_24h_change: 0 } as any });

    const triggered = await checkAlerts();
    expect(triggered).toHaveLength(1);
    expect(triggered[0].direction).toBe("below");
  });

  it("does NOT trigger when price is on the wrong side", async () => {
    addAlert({ symbol: "BTC", direction: "above", threshold: 100000 });
    mockedFetchPrices.mockResolvedValueOnce({ BTC: { usd: 50000, usd_24h_change: 0 } as any });

    expect(await checkAlerts()).toHaveLength(0);
    expect(getAlerts()[0].triggeredAt).toBeUndefined();
    expect(getAlerts()[0].active).toBe(true);
  });

  it("is idempotent — already-triggered alerts do not refire", async () => {
    addAlert({ symbol: "BTC", direction: "above", threshold: 50000 });
    mockedFetchPrices.mockResolvedValue({ BTC: { usd: 51000, usd_24h_change: 0 } as any });

    expect(await checkAlerts()).toHaveLength(1);
    expect(await checkAlerts()).toHaveLength(0);
  });
});

describe("price-alerts: settings + polling", () => {
  it("polling interval reflects sensitivity", () => {
    saveSettings({ ...getSettings(), sensitivity: "high" });
    expect(getPollIntervalMs()).toBe(5_000);
    saveSettings({ ...getSettings(), sensitivity: "normal" });
    expect(getPollIntervalMs()).toBe(30_000);
    saveSettings({ ...getSettings(), sensitivity: "low" });
    expect(getPollIntervalMs()).toBe(120_000);
  });
});

describe("price-alerts: export/import", () => {
  it("round-trips alerts and settings", () => {
    addAlert({ symbol: "BTC", direction: "above", threshold: 70000 });
    addAlert({ symbol: "SOL", direction: "below", threshold: 100 });
    saveSettings({ ...getSettings(), sensitivity: "high", sound: false });

    const backup = JSON.stringify(exportAlerts());
    localStorage.clear();

    const res = importAlerts(backup, "replace");
    expect(res.imported).toBe(2);
    expect(getAlerts()).toHaveLength(2);
    expect(getSettings().sensitivity).toBe("high");
    expect(getSettings().sound).toBe(false);
  });

  it("merge mode dedupes", () => {
    addAlert({ symbol: "BTC", direction: "above", threshold: 70000 });
    const backup = JSON.stringify(exportAlerts());
    importAlerts(backup, "merge");
    expect(getAlerts()).toHaveLength(1);
  });
});

describe("price-alerts: feedback (sound/vibration/push)", () => {
  let oscMock: any;
  let gainMock: any;
  let ctxStartedNodes: any[];

  beforeEach(() => {
    ctxStartedNodes = [];
    oscMock = { type: "", frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn().mockReturnThis(), start: vi.fn(), stop: vi.fn() };
    gainMock = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn().mockReturnThis() };
    (window as any).AudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 0,
      destination: {},
      createOscillator: () => { ctxStartedNodes.push(oscMock); return oscMock; },
      createGain: () => gainMock,
    }));
  });

  afterEach(() => {
    delete (window as any).AudioContext;
  });

  it("playAlertSound creates oscillator + starts it", () => {
    playAlertSound();
    expect(oscMock.start).toHaveBeenCalled();
  });

  it("vibrate calls navigator.vibrate when available", () => {
    const vibeFn = vi.fn();
    (navigator as any).vibrate = vibeFn;
    vibrate([100, 50, 100]);
    expect(vibeFn).toHaveBeenCalledWith([100, 50, 100]);
    delete (navigator as any).vibrate;
  });

  it("pushNotify constructs Notification when permission granted", () => {
    const NotifMock = vi.fn();
    (NotifMock as any).permission = "granted";
    (window as any).Notification = NotifMock;
    pushNotify("Hi", "Body");
    expect(NotifMock).toHaveBeenCalled();
    delete (window as any).Notification;
  });

  it("canPushNotify reflects permission state", () => {
    (window as any).Notification = function () {};
    (window as any).Notification.permission = "denied";
    expect(canPushNotify()).toBe(false);
    (window as any).Notification.permission = "granted";
    expect(canPushNotify()).toBe(true);
    delete (window as any).Notification;
  });

  it("checkAlerts fires sound/vibration/push when settings allow", async () => {
    const vibeFn = vi.fn();
    (navigator as any).vibrate = vibeFn;
    const NotifMock = vi.fn();
    (NotifMock as any).permission = "granted";
    (window as any).Notification = NotifMock;

    saveSettings({ sensitivity: "normal", sound: true, vibration: true, push: true });
    addAlert({ symbol: "BTC", direction: "above", threshold: 50000 });
    mockedFetchPrices.mockResolvedValueOnce({ BTC: { usd: 60000, usd_24h_change: 0 } as any });

    await checkAlerts();

    expect(oscMock.start).toHaveBeenCalled();
    expect(vibeFn).toHaveBeenCalled();
    expect(NotifMock).toHaveBeenCalled();

    delete (navigator as any).vibrate;
    delete (window as any).Notification;
  });

  it("per-alert sound:false overrides global sound:true", async () => {
    saveSettings({ sensitivity: "normal", sound: true, vibration: false, push: false });
    addAlert({ symbol: "BTC", direction: "above", threshold: 50000, sound: false });
    mockedFetchPrices.mockResolvedValueOnce({ BTC: { usd: 60000, usd_24h_change: 0 } as any });

    await checkAlerts();
    expect(oscMock.start).not.toHaveBeenCalled();
  });
});

describe("price-alerts: notification permission helper", () => {
  it("returns 'denied' when Notification API missing", async () => {
    delete (window as any).Notification;
    expect(await requestNotificationPermission()).toBe("denied");
  });

  it("returns existing permission when already decided", async () => {
    (window as any).Notification = { permission: "granted", requestPermission: vi.fn() };
    expect(await requestNotificationPermission()).toBe("granted");
    delete (window as any).Notification;
  });
});
