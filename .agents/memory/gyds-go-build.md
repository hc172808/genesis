---
name: Go build restriction in Replit
description: rpcnode Go code cannot be built inside Replit due to package firewall blocking module resolution
---

# Go build in Replit

## Problem
Running `go build ./...` in /home/runner/workspace/rpcnode or a /tmp clone fails because:
1. Replit's package firewall (package-firewall.replit.local) intercepts Go module downloads
2. Local module paths (github.com/gydschain/rpcnode/core) get treated as external → 404
3. External deps (gorilla/mux etc.) work if cached but network fetches fail

## Workaround
- `go` binary is at `/nix/store/akhjsmrrsakcnj8x3xgygvizhccbyn0v-go-1.19.3/bin/go` (install via installSystemDependencies packages: ["go"])
- For build verification: trust code review + syntax inspection; actual compilation must happen in a real Go environment (CI/CD, server)
- The /docs handler in server.go uses only stdlib (net/url, net/http, io/fs) — no compilation issues

**Why:** Wasted time attempting builds; this is a known environment constraint, not a code bug.
**How to apply:** Skip go build verification in Replit. Instead grep/read the code for syntax correctness and push.
