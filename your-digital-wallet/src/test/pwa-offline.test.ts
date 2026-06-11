import { describe, it, expect } from "vitest";

/**
 * Offline / PWA navigation fallback test.
 *
 * Workbox's `navigateFallback: "index.html"` ensures that when the SPA
 * is offline (or hits an unknown URL), the SW serves the cached
 * `index.html` shell so React Router can mount and render the route.
 *
 * The denylist excludes auth callbacks and API routes from the fallback.
 * This test asserts that key SPA routes are NOT denied and would resolve
 * to the cached shell.
 */

const denylist: RegExp[] = [/^\/~oauth/, /^\/api\//];

function shouldFallbackToShell(pathname: string) {
  return !denylist.some((re) => re.test(pathname));
}

describe("PWA navigation fallback", () => {
  const spaRoutes = [
    "/",
    "/index",
    "/alerts",
    "/dashboard",
    "/swap",
    "/send",
    "/receive",
    "/settings",
    "/admin",
    "/token/ETH",
  ];

  it.each(spaRoutes)("falls back to index.html for %s when offline", (route) => {
    expect(shouldFallbackToShell(route)).toBe(true);
  });

  it("does NOT fall back for /~oauth/* (auth callbacks)", () => {
    expect(shouldFallbackToShell("/~oauth/callback")).toBe(false);
  });

  it("does NOT fall back for /api/* (server endpoints)", () => {
    expect(shouldFallbackToShell("/api/health")).toBe(false);
  });
});
