---
name: GYDS Chain project overview
description: Core facts about the GYDS Chain project — chain config, repo layout, bank integration
---

# GYDS Chain

## Chain config
- Chain ID: 13370
- Symbol: GYDS
- Decimals: 18
- RPC URL: https://rpc.netlifegy.com
- Explorer: https://explorer.netlifegy.com
- Block time: ~3s, PoA consensus, 2 GYDS block reward
- Supply cap: 210,000,000 GYDS
- Min validator stake: 32,000 GYDS

## GitHub org: hc172808 (all repos under this user)
- rpcnode — public, has dashboard + /docs site
- validatornode — private
- fullnode — private
- litenode — private
- bank-connect-hub — separate repo, NETLIFE CASH banking app

## Key files
- push-all.sh — pushes 4 node repos (clones to /tmp/gyds-push/)
- push-bank.sh — pushes bank-connect-hub (also clones to /tmp/gyds-push/)
- rpcnode/rpc/static/docs.html — full developer docs site (1054 lines, dark theme)
- rpcnode/rpc/server.go — /docs route serves docs.html from embedded FS

**Why:** Keeping these facts here saves re-discovery each session since repo names + chain config appear in many places.
**How to apply:** Always use Chain ID 13370 and symbol GYDS everywhere. Never use old 99999 or GYD.
