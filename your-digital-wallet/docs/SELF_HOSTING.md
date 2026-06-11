# GYDS Wallet — Self-Hosting Guide

A practical checklist to run the wallet (and a GYDS RPC node) on your own Linux server.

> Tested on Ubuntu 22.04 LTS. Run all commands as a non-root sudo user.

---

## 1. Required software

| Component        | Purpose                              | Install                              |
|------------------|--------------------------------------|--------------------------------------|
| Node.js 20+      | Build the wallet PWA                 | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install -y nodejs` |
| bun (optional)   | Faster builds                        | `curl -fsSL https://bun.sh/install \| bash` |
| nginx            | TLS + static hosting + reverse proxy | `sudo apt install -y nginx`          |
| certbot          | Free Let's Encrypt TLS               | `sudo apt install -y certbot python3-certbot-nginx` |
| ufw              | Host firewall                        | `sudo apt install -y ufw`            |
| fail2ban         | Brute-force / scanner protection     | `sudo apt install -y fail2ban`       |
| unattended-upgrades | Auto-apply security patches       | `sudo apt install -y unattended-upgrades` |
| git              | Pull the repo                        | `sudo apt install -y git`            |

GYDS RPC node (optional, only if you publish your own endpoints):
- `geth` / `besu` or a custom GYDS binary
- `systemd` unit so the node restarts on boot

---

## 2. Project setup

```bash
git clone https://github.com/<you>/gyds-wallet.git
cd gyds-wallet
cp .env.example .env       # edit network + admin wallets
bun install                # or: npm install
bun run build              # produces ./dist
```

Important `.env` values:

```
VITE_ADMIN_WALLETS=0xabc...,0xdef...
VITE_GYDS_RPC_URLS=https://rpc.example.com,https://rpc2.example.com
```

The hard-coded **super admin** (`0x6422D12BFADdEE5142BFaD21b3006a74D09017B1`)
is the only wallet that can add or remove other admins.

---

## 3. nginx + TLS

Drop this in `/etc/nginx/sites-available/gyds-wallet`:

```nginx
server {
  listen 80;
  server_name wallet.example.com;
  root /var/www/gyds-wallet/dist;
  index index.html;

  # PWA: never cache the service worker or manifest
  location ~* (alerts-sw\.js|sw\.js|manifest\.webmanifest)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }

  # Hashed assets can be cached forever
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location / { try_files $uri /index.html; }

  # Security headers
  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;
  add_header Referrer-Policy strict-origin-when-cross-origin;
  add_header Permissions-Policy "camera=(self), microphone=(), geolocation=()";
}
```

Then:

```bash
sudo ln -s /etc/nginx/sites-available/gyds-wallet /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d wallet.example.com
```

---

## 4. Firewall (ufw)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH         # or `sudo ufw limit 22/tcp`
sudo ufw allow 'Nginx Full'    # 80 + 443
# If you expose a GYDS RPC behind nginx, do NOT open 8545 directly
sudo ufw enable
sudo ufw status verbose
```

---

## 5. fail2ban

```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Edit `/etc/fail2ban/jail.local` and enable at minimum:

```ini
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
```

Then:

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status
```

---

## 6. SSH hardening

In `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers <your-user>
```

Reload: `sudo systemctl reload ssh`.

---

## 7. Automatic security updates

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 8. Monitoring & backups

- **logs**: `sudo journalctl -u nginx -f`, `sudo tail -f /var/log/fail2ban.log`
- **uptime**: hook into UptimeRobot / Healthchecks.io
- **backups**: snapshot `/etc`, `.env`, and any GYDS node data directory daily
- **TLS renewal**: certbot installs a systemd timer automatically — verify with
  `systemctl list-timers | grep certbot`

---

## 9. Verifying the deployment

1. Visit `https://wallet.example.com` — PWA should install.
2. Connect with the super admin wallet → `/admin` should open.
3. **Detection tab** → verify auto-detect tokens / custom tokens toggles persist.
4. **Hosting tab** in admin → run through this checklist; tick each item.
5. From another machine, run `nmap -p- wallet.example.com` — only 22, 80, 443
   should answer.
6. Trigger a fake brute force on SSH → confirm fail2ban bans the IP.

---

## 10. Quick install (one-liner)

```bash
sudo apt update && sudo apt install -y \
  nginx certbot python3-certbot-nginx ufw fail2ban \
  unattended-upgrades git curl
```
