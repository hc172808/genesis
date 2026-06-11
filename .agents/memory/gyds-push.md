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

## bank-connect-hub
```bash
GH_TOKEN=xxx GH_USER=hc172808 bash push-bank.sh --msg "message"
```
- Copies: src/lib/replitLitenode.ts, src/pages/AdminRPCNode.tsx, src/pages/BlockchainSettings.tsx, package.json

## gydschain-token-studio
```bash
GH_TOKEN=xxx GH_USER=hc172808 bash push-token-studio.sh --msg "message"
```
- Copies: src/lib/gydsLitenode.ts, src/lib/blockchain/config.ts, src/lib/blockchain/networkManager.ts, src/hooks/useNetworkStatus.ts, src/hooks/useGydsWebSocket.ts
- Fixed chain IDs from 12345/12346 → 13370

## your-digital-wallet
```bash
GH_TOKEN=xxx GH_USER=hc172808 bash push-digital-wallet.sh --msg "message"
```
- Copies: src/lib/gydsLitenode.ts, src/hooks/useGYDSLitenode.ts

**Why:** Each app repo has its own push script — separate file lists and push logic.
**How to apply:** Run all 6 push scripts after workspace edits; or run push-all.sh for node repos only.

## Token
GH_TOKEN env var — do NOT hardcode. Prompt user or use env var.
