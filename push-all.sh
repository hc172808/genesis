#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  GYDS Chain — Auto-push all node repos to GitHub
#
#  Automatically copies local workspace files to cloned repos
#  and pushes them to GitHub.
#
#  Usage:
#    bash push-all.sh [options]
#
#  Options:
#    --token TOKEN    GitHub Personal Access Token (or set GH_TOKEN env var)
#    --user  USER     GitHub username (default: hc172808)
#    --msg   MESSAGE  Commit message (default: auto-generated with timestamp)
#    --repo  REPO     Push only one repo: rpcnode|validatornode|fullnode|litenode
#    --dry-run        Show what would be pushed without actually pushing
#    --help           Show this help
#
#  Environment variables:
#    GH_TOKEN         GitHub PAT (preferred over --token flag)
#    GH_USER          GitHub username
# ══════════════════════════════════════════════════════════════
set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────
GH_USER="${GH_USER:-hc172808}"
GH_TOKEN="${GH_TOKEN:-}"
COMMIT_MSG=""
ONLY_REPO=""
DRY_RUN=false
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLONE_BASE="/tmp/gyds-push"

# ── Argument parsing ─────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --token)   GH_TOKEN="$2";    shift 2 ;;
    --user)    GH_USER="$2";     shift 2 ;;
    --msg)     COMMIT_MSG="$2";  shift 2 ;;
    --repo)    ONLY_REPO="$2";   shift 2 ;;
    --dry-run) DRY_RUN=true;     shift ;;
    --help|-h)
      sed -n '2,/^# ═/p' "$0" | grep -v "^# ═" | sed 's/^#  \?//'
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()     { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $*"; }
err()     { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $*" >&2; }
success() { echo -e "${GREEN}✓${NC} $*"; }
fail()    { echo -e "${RED}✗${NC} $*"; }

# ── Token prompt ──────────────────────────────────────────────
if [[ -z "$GH_TOKEN" ]]; then
  echo -e "${YELLOW}No GH_TOKEN found. Enter your GitHub Personal Access Token:${NC}"
  echo "  (needs: repo scope — create at https://github.com/settings/tokens)"
  read -rsp "  Token: " GH_TOKEN
  echo ""
fi

[[ -z "$GH_TOKEN" ]] && { err "GitHub token required. Use --token or export GH_TOKEN=..."; exit 1; }

# ── Commit message ────────────────────────────────────────────
[[ -z "$COMMIT_MSG" ]] && COMMIT_MSG="GYDS Chain update — $(date '+%Y-%m-%d %H:%M %Z')"

# ── Repo definitions ──────────────────────────────────────────
# Format: "repo_name:local_dir:files_to_copy..."
declare -A REPO_DIRS
REPO_DIRS=(
  [rpcnode]="rpcnode"
  [validatornode]="validatornode"
  [fullnode]="fullnode"
  [litenode]="litenode"
)

# Files/dirs to sync for each repo
declare -A REPO_FILES
REPO_FILES=(
  [rpcnode]="rpc/server.go rpc/metrics.go rpc/embed.go rpc/static/index.html setup-rpcnode-server.sh setup-firewall.sh setup-wireguard.sh fail2ban grafana"
  [validatornode]="setup-validatornode-server.sh setup-firewall.sh setup-wireguard.sh fail2ban wireguard"
  [fullnode]="rpc/server.go rpc/embed.go rpc/static/index.html setup-firewall.sh setup-wireguard.sh fail2ban wireguard"
  [litenode]="rpc/server.go rpc/embed.go rpc/static/index.html setup-firewall.sh setup-wireguard.sh fail2ban wireguard"
)

mkdir -p "$CLONE_BASE"

PUSHED=0
FAILED=0
SKIPPED=0

push_repo() {
  local REPO="$1"
  local LOCAL_DIR="${WORKSPACE_DIR}/${REPO_DIRS[$REPO]}"
  local CLONE_DIR="${CLONE_BASE}/${REPO}"
  local REMOTE="https://${GH_TOKEN}@github.com/${GH_USER}/${REPO}.git"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Processing: ${REPO}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ ! -d "$LOCAL_DIR" ]]; then
    warn "Local dir not found: $LOCAL_DIR — skipping"
    ((SKIPPED++)) || true
    return
  fi

  # ── Clone or update ────────────────────────────────────────
  if [[ -d "${CLONE_DIR}/.git" ]]; then
    log "Pulling latest from GitHub..."
    if ! git -C "$CLONE_DIR" pull --ff-only 2>/dev/null; then
      warn "Pull failed — resetting to remote HEAD..."
      git -C "$CLONE_DIR" fetch origin
      git -C "$CLONE_DIR" reset --hard origin/main
    fi
  else
    log "Cloning ${REPO}..."
    rm -rf "$CLONE_DIR"
    git clone --quiet "https://${GH_TOKEN}@github.com/${GH_USER}/${REPO}.git" "$CLONE_DIR" || {
      err "Could not clone ${REPO} — check token permissions and repo existence"
      ((FAILED++)) || true
      return
    }
  fi

  # ── Copy files ─────────────────────────────────────────────
  log "Copying workspace files → clone..."
  IFS=' ' read -ra FILES <<< "${REPO_FILES[$REPO]}"
  for f in "${FILES[@]}"; do
    SRC="${LOCAL_DIR}/${f}"
    DST="${CLONE_DIR}/${f}"
    if [[ ! -e "$SRC" ]]; then
      warn "  Skip (not found locally): ${f}"
      continue
    fi
    if [[ -d "$SRC" ]]; then
      mkdir -p "$DST"
      cp -r "${SRC}/." "${DST}/"
      log "  Copied dir : ${f}"
    else
      mkdir -p "$(dirname "$DST")"
      cp "$SRC" "$DST"
      log "  Copied file: ${f}"
    fi
  done

  # ── Detect changes ─────────────────────────────────────────
  CHANGED=$(git -C "$CLONE_DIR" status --porcelain | wc -l | tr -d ' ')
  if [[ "$CHANGED" -eq 0 ]]; then
    success "${REPO} — nothing changed, already up to date"
    ((SKIPPED++)) || true
    return
  fi

  log "${CHANGED} file(s) changed:"
  git -C "$CLONE_DIR" status --short

  if $DRY_RUN; then
    warn "DRY RUN — not committing or pushing"
    ((SKIPPED++)) || true
    return
  fi

  # ── Commit + push ──────────────────────────────────────────
  git -C "$CLONE_DIR" config user.email "gyds-push@gydschain.io"
  git -C "$CLONE_DIR" config user.name  "GYDS Auto-Push"
  git -C "$CLONE_DIR" add --all
  git -C "$CLONE_DIR" commit -m "$COMMIT_MSG"
  git -C "$CLONE_DIR" push origin main

  success "${REPO} pushed successfully → https://github.com/${GH_USER}/${REPO}"
  ((PUSHED++)) || true
}

# ── Main ──────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        GYDS Chain — Auto-Push to GitHub              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  User      : ${GH_USER}"
echo "  Message   : ${COMMIT_MSG}"
$DRY_RUN && echo "  Mode      : DRY RUN (no actual push)" || echo "  Mode      : LIVE PUSH"
echo ""

if [[ -n "$ONLY_REPO" ]]; then
  if [[ -z "${REPO_DIRS[$ONLY_REPO]+_}" ]]; then
    err "Unknown repo: ${ONLY_REPO}. Choose: rpcnode, validatornode, fullnode, litenode"
    exit 1
  fi
  push_repo "$ONLY_REPO"
else
  for REPO in rpcnode validatornode fullnode litenode; do
    push_repo "$REPO"
  done
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pushed  : ${PUSHED}"
echo "  Skipped : ${SKIPPED} (no changes or dry-run)"
echo "  Failed  : ${FAILED}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$PUSHED" -gt 0 ]]; then
  echo ""
  echo "  GitHub repos:"
  for REPO in rpcnode validatornode fullnode litenode; do
    echo "    https://github.com/${GH_USER}/${REPO}"
  done
fi

[[ "$FAILED" -gt 0 ]] && exit 1 || exit 0
