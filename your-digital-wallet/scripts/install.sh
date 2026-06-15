#!/usr/bin/env bash
# GYDS Wallet — one-click install script for Ubuntu 22.04+
# Usage:   curl -fsSL https://<your-host>/scripts/install.sh | sudo bash
# Or:      sudo bash scripts/install.sh
set -euo pipefail

GREEN="\033[0;32m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; NC="\033[0m"
log()  { echo -e "${GREEN}[install]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
fail() { echo -e "${RED}[fail]${NC} $*"; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Run as root: sudo bash $0"

log "Updating apt index…"
apt-get update -y

log "Installing core packages: nginx, certbot, ufw, fail2ban, unattended-upgrades, git, curl…"
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  nginx certbot python3-certbot-nginx ufw fail2ban \
  unattended-upgrades git curl ca-certificates

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  log "Node.js already installed: $(node -v)"
fi

if ! command -v bun >/dev/null 2>&1; then
  log "Installing bun…"
  curl -fsSL https://bun.sh/install | bash || warn "bun install failed; fallback to npm"
fi

log "Enabling unattended security upgrades…"
dpkg-reconfigure --priority=low --frontend=noninteractive unattended-upgrades || true

log "Core install complete. Next: run scripts/harden.sh to lock the server down."
