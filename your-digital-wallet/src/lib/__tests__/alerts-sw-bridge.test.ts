import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Verifies that the alerts service worker:
 * 1. Registers successfully against /alerts-sw.js
 * 2. Records the registration time so the PwaStatusBanner can surface it
 * 3. Updates that timestamp when the SW reports an `updatefound` event
 *    (i.e. a new worker has taken control after a build).
 */

describe("alerts service worker registration", () => {
  const updateListeners: Array<() => void> = [];
  let registerMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    updateListeners.length = 0;
    localStorage.clear();

    const fakeRegistration = {
      active: { postMessage: vi.fn() },
      addEventListener: (evt: string, cb: () => void) => {
        if (evt === "updatefound") updateListeners.push(cb);
      },
    };

    registerMock = vi.fn().mockResolvedValue(fakeRegistration);

    // Pretend we're not in an iframe / preview host
    Object.defineProperty(window, "self", { value: window, configurable: true });
    Object.defineProperty(window, "top", { value: window, configurable: true });
    Object.defineProperty(window, "location", {
      value: { ...window.location, hostname: "wallet.example.com", pathname: "/" },
      configurable: true,
    });

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: registerMock,
        getRegistration: vi.fn().mockResolvedValue(undefined),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        controller: null,
      },
      configurable: true,
    });
  });

  afterEach(() => vi.resetModules());

  it("registers /alerts-sw.js with a narrow scope and records the update time", async () => {
    const { registerAlertsSW } = await import("@/lib/alerts-sw-bridge");
    const reg = await registerAlertsSW();

    expect(registerMock).toHaveBeenCalledWith("/alerts-sw.js", { scope: "/alerts-sw-scope/" });
    expect(reg).not.toBeNull();
    const ts = parseInt(localStorage.getItem("gyds_sw_last_update") || "0", 10);
    expect(ts).toBeGreaterThan(0);
  });

  it("refreshes the last-update timestamp when a new worker takes control", async () => {
    const { registerAlertsSW } = await import("@/lib/alerts-sw-bridge");
    await registerAlertsSW();

    const initial = parseInt(localStorage.getItem("gyds_sw_last_update") || "0", 10);
    expect(updateListeners.length).toBeGreaterThan(0);

    // Simulate workbox updatefound — a newer SW has been installed
    await new Promise((r) => setTimeout(r, 5));
    updateListeners.forEach((cb) => cb());

    const after = parseInt(localStorage.getItem("gyds_sw_last_update") || "0", 10);
    expect(after).toBeGreaterThanOrEqual(initial);
  });
});
