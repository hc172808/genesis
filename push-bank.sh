#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  GYDS — Push bank-connect-hub changes to GitHub
#
#  Usage:
#    GH_TOKEN=xxx bash push-bank.sh --msg "..."
# ══════════════════════════════════════════════════════════════
set -euo pipefail

GH_TOKEN="${GH_TOKEN:-}"
GH_USER="${GH_USER:-hc172808}"
COMMIT_MSG=""
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLONE_DIR="/tmp/gyds-push/bank-connect-hub"

while [[ $# -gt 0 ]]; do
  case $1 in
    --token) GH_TOKEN="$2"; shift 2 ;;
    --user)  GH_USER="$2";  shift 2 ;;
    --msg)   COMMIT_MSG="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

[[ -z "$GH_TOKEN" ]] && { echo "Set GH_TOKEN env var"; exit 1; }
[[ -z "$COMMIT_MSG" ]] && COMMIT_MSG="GYDS Chain update — $(date '+%Y-%m-%d %H:%M %Z')"

GREEN='\033[0;32m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }

REMOTE="https://${GH_TOKEN}@github.com/${GH_USER}/bank-connect-hub.git"
SRC="${WORKSPACE_DIR}/bank-connect-hub"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     bank-connect-hub — Push to GitHub               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  User   : ${GH_USER}"
echo "  Message: ${COMMIT_MSG}"
echo ""

mkdir -p /tmp/gyds-push

# Clone or update
if [[ -d "${CLONE_DIR}/.git" ]]; then
  log "Pulling latest..."
  git -C "$CLONE_DIR" pull --ff-only 2>/dev/null || {
    git -C "$CLONE_DIR" fetch origin
    git -C "$CLONE_DIR" reset --hard origin/main
  }
else
  log "Cloning bank-connect-hub..."
  rm -rf "$CLONE_DIR"
  git clone --quiet "$REMOTE" "$CLONE_DIR"
fi

git -C "$CLONE_DIR" config user.email "gyds@chain.local"
git -C "$CLONE_DIR" config user.name "GYDS Chain Bot"

# Files to sync
FILES=(
  "src/lib/replitLitenode.ts"
  "src/pages/AdminRPCNode.tsx"
  "src/pages/BlockchainSettings.tsx"
  "package.json"
)

log "Copying workspace files → clone..."
for f in "${FILES[@]}"; do
  SRC_F="${SRC}/${f}"
  DST_F="${CLONE_DIR}/${f}"
  if [[ -f "$SRC_F" ]]; then
    mkdir -p "$(dirname "$DST_F")"
    cp "$SRC_F" "$DST_F"
    log "  Copied: ${f}"
  else
    echo "  WARNING: Not found: ${f}"
  fi
done

CHANGED=$(git -C "$CLONE_DIR" status --porcelain | wc -l | tr -d ' ')
if [[ "$CHANGED" -eq 0 ]]; then
  echo -e "${GREEN}✓${NC} bank-connect-hub — nothing changed, already up to date"
  exit 0
fi

log "${CHANGED} file(s) changed:"
git -C "$CLONE_DIR" status --porcelain

git -C "$CLONE_DIR" add -A
git -C "$CLONE_DIR" commit -m "$COMMIT_MSG"
git -C "$CLONE_DIR" push "$REMOTE" main

echo ""
echo -e "${GREEN}✓${NC} bank-connect-hub pushed → https://github.com/${GH_USER}/bank-connect-hub"
