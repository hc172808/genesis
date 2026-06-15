# Plan: Alerts hardening, cloud sync, background push, admin RPC, Android wrapper

This is a large, multi-part request. Below is the scope and approach for each piece. I'll implement them in sequence after approval.

## 1. Automated tests for price alerts

Add Vitest unit tests (`src/lib/__tests__/`):

- `price-alerts.test.ts` — trigger logic for `above`/`below`, idempotent triggering, log entries, settings polling intervals, export/import round-trip.
- `price-alerts-feedback.test.ts` — mocks `Notification`, `navigator.vibrate`, and `AudioContext` to verify per-alert and global sound/vibration/push paths fire (and respect `active`/`triggeredAt`).
- `use-price-alert-monitor.test.tsx` — uses `vi.useFakeTimers()` to confirm the hook polls, calls `checkAlerts`, and updates `triggeredAt` so the UI reflects "triggered" state.

`fetchPrices` will be mocked to return controlled values per test.

## 2. Notification permission UX

In `src/pages/PriceAlerts.tsx`:

- Banner showing live `Notification.permission` state (`default`/`granted`/`denied`).
- "Enable notifications" CTA → `requestNotificationPermission()`.
- If `denied`: troubleshooting accordion with platform-specific steps (Chrome/Safari/Firefox/iOS PWA) + a "Test notification" button that fires a sample push when granted.
- Re-checks permission on focus.

## 3. Cloud sync of alerts via login

Schema (Lovable Cloud):

```text
profiles            (user_id PK)
price_alerts_sync   (user_id, payload jsonb, updated_at)
```

RLS: each row readable/writable only by `auth.uid() = user_id`.

Frontend:

- Lightweight `/login` route (email + password, optional Google). Reuses existing styling.
- New `src/lib/alerts-sync.ts`: `pushToCloud()` / `pullFromCloud()` using the `exportAlerts` / `importAlerts` payload shape.
- Alerts page gets a "Sync" card: status (signed-in / not), Push, Pull, Auto-sync toggle (debounced upload on local change, pull on login).

## 4. Background push via service worker

- Add `public/sw-alerts.js` (or extend the existing PWA SW with `injectManifest`) that:
  - Wakes via `periodicsync` (where supported) every ~15 min, falls back to `setTimeout` when the SW is alive.
  - Reads alerts from `IndexedDB` (mirrored from localStorage on save).
  - Fetches CoinGecko prices and calls `self.registration.showNotification(...)` for triggers.
- `notificationclick` → focus the app and route to `/alerts`.
- Update `vite.config.ts` to switch to `strategies: 'injectManifest'` with `srcDir: 'src/sw'`.
- Note: true server-pushed notifications need a Web Push backend; this delivers "background-checked" notifications, which is what mobile PWAs realistically support today.

## 5. Admin RPC node management (per network)

Extend the **Chains** tab in `src/pages/Admin.tsx`:

- Per chain row: list current RPC URLs (from overrides or defaults) with a "Validate" button per URL that runs `eth_chainId` (EVM) or `getHealth` (Solana) and shows latency / chainId match / error.
- Buttons: **Disable URL** (kept in list but skipped), **Remove URL**, **Add URL**, **Reset to defaults**, **Force-disable network** (existing kill switch).
- Persist disabled URLs in a new `gyds_chain_rpc_disabled` localStorage key; `chain-adapter` filters them out of `rpcUrls` at runtime.
- Bulk "Validate all" action with green/red badges.

## 6. Android Studio / app-builder export folder

Create `mobile/` with everything needed to wrap the PWA:

```text
mobile/
  capacitor.config.ts         # appId io.netlifegy.gyds, name "GYDS Wallet"
  package.json                # capacitor + plugins (push, haptics, app)
  README.md                   # step-by-step: bun install, build, npx cap add android, open in Android Studio
  android-resources/          # icons + splash sources
  bubblewrap/                 # twa-manifest.json for PWABuilder/Bubblewrap users
  pwabuilder.json             # ready-to-import config for pwabuilder.com
```

The PWA itself stays the source of truth; `mobile/` just wraps it.

## 7. TODO.md update

Reflect what's done vs deferred (real Web Push server, iOS background limits, Capacitor native push wiring).

## Order of implementation

1. Tests (catch regressions while changing alerts code).
2. Notification permission UX.
3. Service-worker background alerts + IndexedDB mirror.
4. Cloud sync (DB migration + login + UI).
5. Admin RPC management.
6. `mobile/` wrapper folder + docs.
7. Update `TODO.md`.

## Notes / risks

- iOS Safari does **not** support `periodicsync`; background notifications there only fire while the SW is recently active. The troubleshooting UI will call this out.
- Cloud sync requires authentication; I'll default to email+password and Google per Lovable Cloud guidance unless you want a different setup.
- Switching to `injectManifest` changes the SW build slightly; existing caching rules will be preserved.

Approve to proceed, or tell me which pieces to drop/reorder.
