## Scope

Build 4 new feature areas and 4 cross-cutting polish items on top of the existing GydsChain platform. All blockchain calls use the existing `dexRouter` / `rpcClient` patterns — no mocks. All persistence goes through the existing self-hosted Postgres REST API (`VITE_DB_API_URL`).

---

## 1. Feature: Token Staking & Rewards
**Route:** `/staking`
- Staking pools list (GYDS single-asset + LP-token pools from deployed pairs)
- Stake / Unstake / Claim flows using `WalletConfirmDialog`
- Real on-chain calls via new `src/lib/blockchain/stakingClient.ts` (encodes `stake`, `withdraw`, `getReward`)
- New `contracts/StakingRewards.sol` (Synthetix-style, deployable from Admin → DEX tab)
- DB table `staking_positions` (user, pool, amount, rewards_claimed, updated_at)
- Admin: register staking contract addresses per network in `dexConfig.ts`

## 2. Feature: Governance / DAO Voting
**Route:** `/governance`, `/governance/:proposalId`
- Proposal list + detail with For/Against/Abstain bars
- Create proposal (gated to GYDS holders above threshold)
- Token-weighted voting using snapshot of holder balance at proposal block
- DB tables `proposals`, `proposal_votes`
- New `contracts/GovernorSimple.sol` + `src/lib/blockchain/governance.ts`
- Quorum + voting period configurable in Admin → Governance tab

## 3. Feature: Notifications Center
**Component:** Bell icon in `Navbar`, dropdown panel + `/notifications` full page
- Real-time via existing `useGydsWebSocket` for tx confirmations
- Event types: tx success/fail, hosting expiry (T-7/T-1/expired), price alerts, governance proposal, staking rewards available
- DB table `notifications` (user_address, type, title, body, link, read_at)
- New `src/hooks/useNotifications.ts` + `src/lib/notificationsService.ts`
- Mark all read, filter by type, unread badge count

## 4. Feature: Token Launchpad / Presale
**Routes:** `/launchpad`, `/launchpad/create`, `/launchpad/:id`
- Wizard: token select, soft/hard cap, price, start/end, vesting schedule, whitelist toggle
- Contribute flow (GYDS in → tokens claimable after end)
- Refund if soft cap missed
- Claim portal with vesting unlock timeline
- New `contracts/Presale.sol` + `src/lib/blockchain/presale.ts`
- DB tables `presales`, `presale_contributions`

---

## 5. Polish: Mobile UX Pass
- Audit every route at 360px viewport
- Fix Navbar collapse, table horizontal scroll wrappers, tap targets ≥44px
- Convert dense admin tables to card lists on `< md`
- Drawer-based filters on Gallery/Leaderboard

## 6. Polish: i18n (EN / AR / FR)
- Add `react-i18next` + `i18next-browser-languagedetector`
- Locale JSONs in `src/locales/{en,ar,fr}.json`
- Language switcher in Navbar; persist to `localStorage`
- RTL support: toggle `dir="rtl"` on `<html>` for Arabic, mirror critical layouts via Tailwind `rtl:` variants

## 7. Polish: Dark / Light Theme Toggle
- `ThemeProvider` using `next-themes` (already shadcn-friendly)
- Sun/Moon toggle in Navbar
- Define `:root` light tokens in `index.css` (mirror dark palette)
- Persist preference; default = system

## 8. Polish: PWA + Offline Shell
- Manifest-only install (no service worker caching of HTML — per Lovable PWA guidance) for the editor preview
- For published build: `vite-plugin-pwa` with `devOptions.enabled = false`, NetworkFirst HTML, denylist `/~oauth`
- Iframe/preview guard in `main.tsx` to never register SW in preview
- Offline fallback page `/offline`
- App icons + `manifest.json`

---

## Database changes (new SQL migration `sql/006_features.sql`)
```sql
CREATE TABLE public.staking_positions(...);
CREATE TABLE public.proposals(...);
CREATE TABLE public.proposal_votes(...);
CREATE TABLE public.notifications(...);
CREATE TABLE public.presales(...);
CREATE TABLE public.presale_contributions(...);
-- Plus the REST API exposes them; same VITE_DB_API_URL pattern as site_domains
```

## New smart contracts
```
contracts/StakingRewards.sol
contracts/GovernorSimple.sol
contracts/Presale.sol
```
Each gets a deployment entry in Admin → DEX tab and is gated behind `DexNotDeployedGate`-style components when not registered.

## Navbar updates
- Add Staking, Governance, Launchpad links (in a "DeFi+" dropdown to avoid clutter on mobile)
- Add bell icon (notifications), theme toggle, language switcher

---

## Order of implementation
1. Notifications (used by other features for confirmations)
2. Theme toggle + i18n scaffold (touch every page anyway)
3. Staking
4. Governance
5. Launchpad
6. Mobile UX pass (after all new pages exist)
7. PWA (last — least disruptive)

## Out of scope
- No new payment provider (still GYDS-only)
- No KYC for launchpad (whitelist toggle only)
- No off-chain governance / Snapshot integration
- No push notifications (in-app + WebSocket only; email later if desired)

This is a large multi-week scope. After approval I'll implement in the order above, committing after each numbered section so you can review incrementally.
