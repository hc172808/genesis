---
name: Vite config constraints
description: Port, host, and lovable-tagger requirements for this project's Vite setup.
---

Vite must listen on port **5000** with `host: "0.0.0.0"` and `allowedHosts: true` for the Replit webview proxy to work.

The `lovable-tagger` package (`componentTagger()`) is imported in `vite.config.ts` and used in dev mode. If it is missing, Vite fails with `ERR_MODULE_NOT_FOUND` and the workflow dies. Install it with `installLanguagePackages({ packages: ["lovable-tagger"], language: "nodejs" })` via code_execution before restarting.

**Why:** Replit webview proxy only accepts port 5000 for webview output type. The `lovable-tagger` dependency is a Lovable platform tool that gets pruned on environment resets.

**How to apply:** After any `npm install` that might prune devDeps, verify `lovable-tagger` is still present before restarting the workflow.
