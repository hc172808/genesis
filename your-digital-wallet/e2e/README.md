# GYDS Wallet — Playwright E2E tests

These specs are runnable but Playwright is not installed by default to keep
the dev image small. To run them:

```bash
bun add -D @playwright/test
bunx playwright install --with-deps chromium
bunx playwright test e2e/
```

The tests use `page.addInitScript` to seed `localStorage` (wallet address,
imported tokens, admin runtime list) so they can exercise the UI without
going through wallet setup. They run against a `bun run dev` server on
`http://localhost:8080` (see `playwright.config.ts`).
