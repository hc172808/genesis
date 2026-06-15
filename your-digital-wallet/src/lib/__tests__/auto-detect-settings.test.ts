import { describe, it, expect, beforeEach } from "vitest";
import {
  isAutoDetectTokensEnabled,
  setAutoDetectTokensEnabled,
  isAutoDetectCustomTokensEnabled,
  setAutoDetectCustomTokensEnabled,
} from "@/lib/auto-detect-settings";

describe("auto-detect settings persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to enabled when no value has been stored", () => {
    expect(isAutoDetectTokensEnabled()).toBe(true);
    expect(isAutoDetectCustomTokensEnabled()).toBe(true);
  });

  it("persists token auto-detection toggle across reads (simulated reload)", () => {
    setAutoDetectTokensEnabled(false);
    expect(localStorage.getItem("gyds_auto_detect_tokens")).toBe("0");
    // simulate a page reload: settings module re-reads from localStorage on every call
    expect(isAutoDetectTokensEnabled()).toBe(false);

    setAutoDetectTokensEnabled(true);
    expect(localStorage.getItem("gyds_auto_detect_tokens")).toBe("1");
    expect(isAutoDetectTokensEnabled()).toBe(true);
  });

  it("persists custom-token auto-refresh toggle independently", () => {
    setAutoDetectCustomTokensEnabled(false);
    expect(isAutoDetectCustomTokensEnabled()).toBe(false);
    // other toggle untouched
    expect(isAutoDetectTokensEnabled()).toBe(true);
  });

  it("changes are observable immediately — TokenDiscovery would see the new value on next mount", () => {
    setAutoDetectTokensEnabled(false);
    // The TokenDiscovery effect reads isAutoDetectTokensEnabled() at mount; the
    // very next call must already reflect the new value (no caching).
    const observedByNextMount = isAutoDetectTokensEnabled();
    expect(observedByNextMount).toBe(false);
  });
});
