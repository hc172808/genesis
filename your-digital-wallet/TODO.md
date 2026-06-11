# GYDS Wallet — TODO

## ✅ Done

- Self-custodial PWA wallet (EVM + Solana balances, swap, send/receive)
- Token Detail page with CoinGecko charts and "Set price alert" CTA
- Price Alerts page: dynamic CoinGecko symbol validation, sensitivity slider,
  per-alert sound/vibration, global push toggle, JSON export/import
- Background service worker (`public/alerts-sw.js`) that polls CoinGecko via
  `periodicsync` (where supported) and shows OS notifications when the app
  is closed — registered with a narrow scope so it never intercepts navigation
- Notification permission card with denied-state troubleshooting
  (iOS install hint, Chrome/Safari/Android steps, Test button)
- Cloud sync card (email + password) — UI ready; backend table added via
  migration `price_alerts_sync` (RLS: each user owns their row)
- Admin Chains tab: per-network RPC list, add+validate (eth_chainId / getHealth),
  per-URL **Disable** toggle (skipped in failover, kept for re-enable),
  remove, reset, and full-network kill switch
- GYD decimals fixed to 6 across Send / Swap / TokenDetail
- Vitest coverage:
  - `src/lib/__tests__/price-alerts.test.ts` — trigger logic, idempotency,
    sound/vibration/push, permission helper, export/import
  - `src/hooks/__tests__/use-price-alert-monitor.test.tsx` — polling + toast
- `mobile/` folder with Capacitor config, Bubblewrap manifest, and
  PWABuilder JSON for direct upload to Android Studio / pwabuilder.com

## 🟡 Next (handoff to dev)

- Resume Lovable Cloud, then run pending migration so `CloudSyncCard`
  push/pull lights up end-to-end
- Add Google OAuth provider in Cloud → Auth (CloudSyncCard already opens
  on the right tab to add a "Continue with Google" button)
- Wire `@capacitor/push-notifications` + an FCM-backed edge function for
  true server-pushed alerts when the OS has killed the SW (see
  `mobile/notes/push.md`)
- Whale-tracking + alpha-token signal alerts (extend `price-alerts.ts`
  with a `kind: "whale" | "price"` discriminator)
- Per-URL latency benchmark in Admin (validate-all bulk button + green/red
  badge with ms latency)
- E2E test for the SW bridge (`alerts-sw-bridge.ts`) under Playwright

## ⚠️ Platform notes

- iOS Safari does **not** support `periodicsync`. Background alerts there
  fire only while the SW is recently active, so iOS users should keep the
  app installed to the Home Screen and open it occasionally.
- Lovable preview iframe deliberately unregisters all SWs in `main.tsx`
  to avoid stale-cache issues — background push only works on the
  published / deployed origin.
