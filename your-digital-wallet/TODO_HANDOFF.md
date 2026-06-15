# GYDS Wallet — Developer / AI Handoff TODO

This file is the canonical handoff list for **any AI agent or human dev** picking up the project. Read it top-to-bottom before changing anything.

> Companion docs: [`TODO.md`](./TODO.md) (sprint-level), [`docs/SELF_HOSTING.md`](./docs/SELF_HOSTING.md) (deployment), [`README.md`](./README.md) (overview).

---

## 0. Stack at a glance

- **Frontend**: React 18 + Vite 5 + Tailwind v3 + TypeScript
- **Wallet engine**: `ethers.js` v6 (EVM), `@solana/web3.js` (Solana)
- **Backend**: Lovable Cloud (Supabase under the hood — never expose that name to users)
- **Tests**: vitest (unit) + optional Playwright (e2e in `e2e/`)
- **PWA**: `vite-plugin-pwa` with a hand-written `public/alerts-sw.js` for background price alerts
- **Super admin (hard-coded, do not change)**: `0x6422D12BFADdEE5142BFaD21b3006a74D09017B1`

## 1. What is already done ✅

- Self-custodial EVM + Solana wallet, BIP44 multi-account
- Multi-chain (Ethereum / Polygon / GYDS / BNB / Arbitrum / Optimism) with per-chain RPC failover + admin Disable toggles
- Auto-detection of well-known ERC-20s and refresh of imported tokens (toggleable from `Admin → Detection`)
- Custom token import with `(contractAddress, chainId)` uniqueness — same contract on different chains is allowed
- Per-chain badges in the assets list (Ethereum / Polygon / GYDS …)
- Admin panel with **GYDS / Chains / Admins / Detection / Hosting / Debug** tabs
- Super-admin-only mutations on the admin list (others get a friendly forbidden toast)
- RPC debug panel logging chainId + RPC URL + latency + cache storage sizes
- Price alerts with background SW + iOS install hints + JSON export/import
- PWA install + status banner with "new version available → Refresh" CTA
- Self-hosting docs + one-click install/harden bash scripts in `scripts/`
- Vitest suite (admin governance, balance fetcher routing, chain badges, auto-detect toggles, PWA navigation fallback, alerts sw bridge)
- Playwright skeletons for chain badges + super admin governance under `e2e/`

## 2. What is NOT done yet ⏳

Pick these up in roughly this order:

1. **Resume Lovable Cloud, then run the pending price-alerts sync migration** so `CloudSyncCard` can push/pull
2. **Add Google OAuth provider** in Cloud → Auth (the UI already opens on the right tab)
3. **Server-pushed alerts** via `@capacitor/push-notifications` + an FCM-backed edge function (see `mobile/notes/push.md`)
4. **Whale + alpha-token alerts** — extend `price-alerts.ts` with `kind: "price" | "whale"`
5. **Per-URL latency benchmark** in Admin (bulk validate-all with ms badges)
6. **E2E Playwright wiring** — `bun add -D @playwright/test && bunx playwright install` then `bunx playwright test e2e/`
7. **True server-side hosting probes** — current checklist is best-effort client-side; an `/api/health` endpoint exposing firewall / fail2ban status would let us turn the manual rows green automatically

## 3. Things to be careful with ⚠️

- **Never** edit `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, or `.env` — they are auto-generated.
- **Never** add roles to a profiles table; roles must live in their own table with `security definer` checks.
- **Never** check admin status from `localStorage` for anything sensitive that touches the backend — `admin-auth.ts` is for UI gating only.
- **Never** remove or rename the hard-coded super admin without an explicit request and a migration to re-seat it.
- The Lovable preview iframe deliberately unregisters all service workers in `main.tsx`. Background alerts only work on the deployed origin.

## 4. How to add a feature

1. Read this file + `TODO.md`.
2. Check `mem://index.md` for project-level rules (design tokens, network IDs, etc.).
3. If the feature touches:
   - **a new chain** → register it in `src/lib/chain-adapter.ts` and add a label in `getChainLabel`
   - **a new admin capability** → gate it behind `isSuperAdmin(walletAddress)`
   - **a new background job** → put it in `public/alerts-sw.js`, never in app code
   - **a new env var** → also add it to `.env.example` and the hosting checklist
4. Add a vitest spec next to the file (`__tests__/<name>.test.ts`).
5. Update this TODO + bump `APP_VERSION` in `src/lib/network-config.ts`.

## 5. How to debug

- RPC routing → `Admin → Debug` tab (uses `src/lib/rpc-debug-log.ts`)
- Service worker / cache → DevTools › Application › Service Workers + the PwaStatusBanner
- Price alerts → `PriceAlerts` page + console log group `"[alerts-sw]"`
- Network config → `Admin → GYDS` and `Admin → Chains`

## 6. Release / upgrade flow

1. `bun install && bun run build`
2. Bump `APP_VERSION` in `src/lib/network-config.ts`
3. Deploy `dist/` (nginx in `docs/SELF_HOSTING.md`)
4. The PWA service worker auto-detects the new build and the in-app banner shows **"Update available → Refresh"**.
5. Users keep working while the new SW activates — the previous build stays in use until they hit Refresh.

---

_Last updated when you read it. If something is stale, **fix it here first** before writing code._
