---
name: Push workflow for GYDS repos
description: How to push all GYDS Chain repos to GitHub from this workspace
---

# Push workflow

## GYDS node repos (4 repos)
```bash
GH_TOKEN=xxx GH_USER=hc172808 bash push-all.sh --msg "message"
# Optional: --repo rpcnode  (to push only one)
# Optional: --dry-run
```
- Clones each repo to /tmp/gyds-push/<name>
- Copies workspace files per REPO_FILES array in push-all.sh
- rpcnode REPO_FILES includes: core/chain.go rpc/server.go rpc/metrics.go rpc/embed.go rpc/static/index.html rpc/static/docs.html ... developer-tools TODO.md

## bank-connect-hub (separate repo)
```bash
GH_TOKEN=xxx GH_USER=hc172808 bash push-bank.sh --msg "message"
```
- Clones to /tmp/gyds-push/bank-connect-hub
- Copies: src/lib/replitLitenode.ts, src/pages/AdminRPCNode.tsx, src/pages/BlockchainSettings.tsx, package.json

**Why:** bank-connect-hub is under hc172808 (not gydschain org) and has different file list — needs separate push script.
**How to apply:** Run push-all.sh + push-bank.sh after any workspace edits to push everything.

## Token
GH_TOKEN env var — do NOT hardcode. Prompt user or use env var.
