#!/usr/bin/env bash
# GYDS Wallet — server hardening (ufw + fail2ban + nginx + certbot)
# Usage:  sudo DOMAIN=wallet.example.com EMAIL=you@example.com bash scripts/harden.sh
set -euo pipefail

GREEN="\033[0;32m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; NC="\033[0m"
log()  { echo -e "${GREEN}[harden]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
fail() { echo -e "${RED}[fail]${NC} $*"; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Run as root: sudo bash $0"

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
APP_ROOT="${APP_ROOT:-/var/www/gyds-wallet/dist}"

[ -n "$DOMAIN" ] || fail "Set DOMAIN=wallet.example.com"
[ -n "$EMAIL" ]  || fail "Set EMAIL=you@example.com (for Let's Encrypt)"

# ── 1. UFW firewall ───────────────────────────────────────────
log "Configuring ufw…"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw limit 22/tcp comment 'SSH (rate-limited)'
ufw allow 'Nginx Full'
yes | ufw enable
ufw status verbose

# ── 2. fail2ban ───────────────────────────────────────────────
log "Configuring fail2ban…"
cat >/etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-botsearch]
enabled = true
port    = http,https
logpath = /var/log/nginx/access.log
EOF
systemctl enable --now fail2ban
fail2ban-client status || true

# ── 3. nginx vhost ────────────────────────────────────────────
log "Writing nginx vhost for ${DOMAIN}…"
mkdir -p "$APP_ROOT"
cat >/etc/nginx/sites-available/gyds-wallet <<EOF
server {
  listen 80;
  server_name ${DOMAIN};
  root ${APP_ROOT};
  index index.html;

  location ~* (alerts-sw\\.js|sw\\.js|manifest\\.webmanifest)\$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location / { try_files \$uri /index.html; }

  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;
  add_header Referrer-Policy strict-origin-when-cross-origin;
  add_header Permissions-Policy "camera=(self), microphone=(), geolocation=()";
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
EOF
ln -sf /etc/nginx/sites-available/gyds-wallet /etc/nginx/sites-enabled/gyds-wallet
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 4. TLS via certbot ────────────────────────────────────────
log "Requesting Let's Encrypt cert for ${DOMAIN}…"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

systemctl list-timers | grep -i certbot || warn "certbot timer not detected"

# ── 5. SSH hardening (key-only) ───────────────────────────────
log "Hardening SSH (key-only, no root, no passwords)…"
sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd

log "✅ Hardening complete for ${DOMAIN}"
log "Verify: visit https://${DOMAIN} — PWA should install."
