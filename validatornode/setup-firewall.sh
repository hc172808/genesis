#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  GYDS Chain — Validator Node  /  Firewall + fail2ban hardening
#
#  The validator holds your signing key. Rules here are
#  intentionally STRICT — even one probe of port 8545 = 7-day ban.
#
#  Usage:
#    sudo bash setup-firewall.sh [options]
#
#  Options:
#    --ssh-port PORT    SSH port (default: 22)
#    --p2p-port PORT    P2P port (default: 30303)
#    --status           Show current ban list and rules, then exit
#    --unban IP         Remove an IP from all bans, then exit
# ══════════════════════════════════════════════════════════════
set -euo pipefail

SSH_PORT="${SSH_PORT:-22}"
P2P_PORT="${P2P_PORT:-30303}"
RPC_PORT="${RPC_PORT:-8545}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while [[ $# -gt 0 ]]; do
  case $1 in
    --ssh-port) SSH_PORT="$2"; shift 2 ;;
    --p2p-port) P2P_PORT="$2"; shift 2 ;;
    --status)
      echo "=== UFW Status ===" && ufw status numbered
      echo "" && echo "=== fail2ban Banned IPs ==="
      for j in sshd gyds-validator-rpc-probe gyds-p2p-flood recidive; do
        echo "--- $j ---" && fail2ban-client status "$j" 2>/dev/null | grep "Banned IP" || true
      done
      exit 0 ;;
    --unban)
      IP="$2"; shift 2
      for j in sshd gyds-validator-rpc-probe gyds-p2p-flood recidive; do
        fail2ban-client set "$j" unbanip "$IP" 2>/dev/null && echo "Unbanned $IP from $j" || true
      done
      ufw delete deny from "$IP" 2>/dev/null || true
      echo "Done unbanning $IP"
      exit 0 ;;
    *) shift ;;
  esac
done

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
warn() { echo "[$(date '+%H:%M:%S')] WARNING: $*" >&2; }

[[ $EUID -ne 0 ]] && { echo "Run as root: sudo bash $0"; exit 1; }

# ── 1. UFW — strict validator firewall ──────────────────────
log "Applying strict UFW firewall rules for validator node..."

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw default deny forward

# SSH with kernel-level rate limiting
ufw limit   "${SSH_PORT}"/tcp   comment "SSH (rate-limited)"

# P2P only — no RPC exposure
ufw allow   "${P2P_PORT}"/tcp   comment "GYDS P2P"
ufw allow   "${P2P_PORT}"/udp   comment "GYDS P2P UDP"

# Explicitly block RPC from any external source
ufw deny    "${RPC_PORT}"/tcp   comment "Validator RPC BLOCKED externally"

# WireGuard VPN — operator access tunnel
ufw allow   51820/udp            comment "WireGuard VPN"

# Block common attack ports
for port in 23 80 443 2375 2376 3306 5432 6379 27017 8080 8443; do
  ufw deny ${port}/tcp comment "Attack surface reduction" 2>/dev/null || true
done

# Enable logging so fail2ban can parse UFW blocks
ufw logging on

ufw --force enable
log "UFW enabled."

# ── 2. Sysctl — network hardening ───────────────────────────
log "Applying sysctl network hardening..."

cat > /etc/sysctl.d/99-gyds-validator-hardening.conf <<SYSCTL
# ── GYDS Validator node network hardening ─────────────────

net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 1
net.ipv4.tcp_syn_retries = 3

net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0

net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

net.netfilter.nf_conntrack_max = 131072
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_keepalive_time = 120

net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Disable IPv6 if not needed (reduces attack surface)
# Uncomment if your network doesn't use IPv6:
# net.ipv6.conf.all.disable_ipv6 = 1
# net.ipv6.conf.default.disable_ipv6 = 1
SYSCTL

sysctl -p /etc/sysctl.d/99-gyds-validator-hardening.conf
log "Sysctl hardening applied."

# ── 3. fail2ban — install + deploy strict config ────────────
log "Configuring fail2ban for validator node..."

if ! command -v fail2ban-server &>/dev/null; then
  log "Installing fail2ban..."
  if command -v apt-get &>/dev/null; then
    apt-get install -y fail2ban
  elif command -v dnf &>/dev/null; then
    dnf install -y fail2ban
  elif command -v yum &>/dev/null; then
    yum install -y fail2ban
  else
    warn "Could not install fail2ban — install manually then re-run."
    exit 1
  fi
fi

cp "${SCRIPT_DIR}/fail2ban/jail.local" /etc/fail2ban/jail.local
mkdir -p /etc/fail2ban/filter.d
for f in "${SCRIPT_DIR}/fail2ban/filter.d/"*.conf; do
  cp "$f" /etc/fail2ban/filter.d/
  log "Deployed filter: $(basename "$f")"
done

# UFW action for fail2ban
if ! grep -q "\[Definition\]" /etc/fail2ban/action.d/ufw.conf 2>/dev/null; then
  cat > /etc/fail2ban/action.d/ufw.conf <<'UFW_ACTION'
[Definition]
actionstart =
actionstop  =
actioncheck =
actionban   = ufw insert 1 deny from <ip> to any
actionunban = ufw delete deny from <ip> to any
UFW_ACTION
fi

systemctl enable fail2ban
systemctl restart fail2ban
sleep 2
log "fail2ban status:"
fail2ban-client status

# ── 4. SSH hardening ─────────────────────────────────────────
log "Hardening SSH configuration..."

SSHD_CONF="/etc/ssh/sshd_config"
# Back up original
cp -n "$SSHD_CONF" "${SSHD_CONF}.gyds-backup" 2>/dev/null || true

# Apply hardening (idempotent — only sets if not already configured)
set_sshd() {
  local key="$1" val="$2"
  if grep -qE "^#?${key}" "$SSHD_CONF"; then
    sed -i "s|^#\?${key}.*|${key} ${val}|" "$SSHD_CONF"
  else
    echo "${key} ${val}" >> "$SSHD_CONF"
  fi
}

set_sshd PermitRootLogin          no
set_sshd PasswordAuthentication   no          # key-only (change to yes if you need passwords)
set_sshd MaxAuthTries              3
set_sshd LoginGraceTime            20
set_sshd X11Forwarding             no
set_sshd AllowTcpForwarding        no
set_sshd ClientAliveInterval       300
set_sshd ClientAliveCountMax       2

sshd -t && systemctl reload sshd && log "SSH hardened."
warn "Password SSH login is now DISABLED. Ensure your public key is in ~/.ssh/authorized_keys before closing this session."

# ── 5. Summary ───────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       GYDS Validator Node — Firewall Hardened        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  UFW           : deny all  |  allow SSH + P2P only"
echo "  Port 8545     : BLOCKED from internet (RPC localhost-only)"
echo "  fail2ban      : SSH (48h ban), RPC probe (7-day ban)"
echo "  SSH passwords : DISABLED (key-only login)"
echo "  Sysctl        : /etc/sysctl.d/99-gyds-validator-hardening.conf"
echo ""
echo "  Useful commands:"
echo "    sudo bash setup-firewall.sh --status         # show bans"
echo "    sudo bash setup-firewall.sh --unban 1.2.3.4  # unban IP"
echo "    sudo fail2ban-client status sshd             # SSH jail"
echo "    sudo fail2ban-client status gyds-validator-rpc-probe"
echo "    sudo ufw status numbered"
echo ""
