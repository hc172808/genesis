---
name: Web Hosting Platform
description: IPFS or Local Server hosting, subscriptions, built-in editor, custom domains, renewal
type: feature
---

GydsChain Web Hosting lets users host websites paid in GYDS.

- Hosting types: IPFS (decentralized) or Local Server (downloads HTML for self-hosting).
- Subscriptions: 30-day periods, renewable. Renewal extends from current expiry if still active, otherwise from now.
- Plans: Starter (1MB/0.5 GYDS), Basic (3MB/1 GYDS), Standard (5MB/2 GYDS), Pro (10MB/5 GYDS).
- Site editor at /hosting/edit/:id with template gallery (4 themes).
- Custom domains: persisted in `site_domains` table (sql/005). Status flow: pending → verifying → active. SSL auto-provisioned on verification. One primary per site enforced via unique partial index.
- Renewal flow uses WalletConfirmDialog with "renew" action; calls `renewSite()` which patches expires_at and creates a confirmed hosting_payments record.
- Service layer: src/lib/hostingService.ts exports renewSite, fetchSiteDomains, createSiteDomain, updateSiteDomain, deleteSiteDomain, setPrimaryDomain.
