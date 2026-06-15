---
name: TypeScript check in this environment
description: How to run tsc --noEmit when node/npx are not on PATH.
---

`node`, `npx`, and `tsc` are not on the default PATH in this Replit environment. Options:

1. Use the nvm path: `export PATH="$(ls -d /home/runner/.local/share/nvm/versions/node/*/bin | tail -1):$PATH" && node node_modules/.bin/tsc --noEmit`
2. Infer success from workflow startup — if Vite starts without errors and HMR connects, TypeScript is likely clean (Vite uses `swc`, not `tsc` for transpilation, so runtime errors still surface).
3. Zero output from the tsc command = zero errors.

**Why:** NixOS environment does not symlink node to a standard PATH location. The nvm shim is the reliable path.
