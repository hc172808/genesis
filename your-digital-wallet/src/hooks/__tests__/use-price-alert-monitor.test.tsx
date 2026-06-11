import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/lib/price-alerts", () => ({
  checkAlerts: vi.fn().mockResolvedValue([]),
  getPollIntervalMs: vi.fn().mockReturnValue(1000),
  hydrateRegisteredSymbols: vi.fn(),
}));
vi.mock("@/lib/price-fetcher", () => ({
  formatPrice: (n: number) => `$${n}`,
}));

import { usePriceAlertMonitor } from "@/hooks/use-price-alert-monitor";
import { checkAlerts, hydrateRegisteredSymbols } from "@/lib/price-alerts";
import { toast } from "sonner";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

describe("usePriceAlertMonitor", () => {
  it("hydrates symbols and runs an initial check", async () => {
    renderHook(() => usePriceAlertMonitor(1000));
    await act(async () => { await Promise.resolve(); });
    expect(hydrateRegisteredSymbols).toHaveBeenCalled();
    expect(checkAlerts).toHaveBeenCalled();
  });

  it("polls on the provided interval", async () => {
    renderHook(() => usePriceAlertMonitor(500));
    await act(async () => { await Promise.resolve(); });
    expect(checkAlerts).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(500); await Promise.resolve(); });
    expect(checkAlerts).toHaveBeenCalledTimes(2);
  });

  it("emits a toast when checkAlerts returns triggers", async () => {
    (checkAlerts as any).mockResolvedValueOnce([
      { id: "1", alertId: "a", symbol: "BTC", threshold: 50000, direction: "above", price: 51000, triggeredAt: Date.now() },
    ]);
    renderHook(() => usePriceAlertMonitor(1000));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(toast.success).toHaveBeenCalled();
  });
});
