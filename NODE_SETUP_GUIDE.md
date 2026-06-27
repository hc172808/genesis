# GYDS Chain — Node Setup Guide

> **Chain ID:** 13370 | **Symbol:** GYDS | **Block time:** 5 seconds

This guide covers all four GYDS Chain node types. Run them on separate servers for best results.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server Requirements](#server-requirements)
3. [Port Reference](#port-reference)
4. [Node 1 — Litenode](#node-1--litenode)
5. [Node 2 — RPC Node](#node-2--rpc-node)
6. [Node 3 — Boost Node](#node-3--boost-node)
7. [Node 4 — Validator Node](#node-4--validator-node)
8. [Connecting Nodes Together](#connecting-nodes-together)
9. [Monitoring (Grafana + Prometheus)](#monitoring-grafana--prometheus)
10. [MetaMask / Trust Wallet Setup](#metamask--trust-wallet-setup)
11. [Common Management Commands](#common-management-commands)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
  Users / Wallets
       │
       ▼
  ┌─────────────┐       ┌──────────────┐
  │  RPC Node   │◄─────►│  Boost Node  │  (transaction relay + mempool)
  │  port 8545  │       │  port 30306  │
  └──────┬──────┘       └──────┬───────┘
         │                     │
         └──────────┬──────────┘
                    │ P2P gossip
              ┌─────▼──────┐
              │  Litenode  │  (light sync, browser/mobile)
              │  port 8545 │
              └─────┬──────┘
                    │
              ┌─────▼──────────┐
              │ Validator Node │  (PoS block production — RPC localhost only)
              │  port 30303    │
              └────────────────┘
```

**Recommended deployment order:** Validator → Boost → RPC → Litenode

---

## Server Requirements

| Node Type | Min RAM | Min CPU | Min Disk | Public ports |
|-----------|---------|---------|----------|--------------|
| Litenode | 1 GB | 1 vCPU | 20 GB | 8545, 8546, 30303 |
| RPC Node | 4 GB | 2 vCPU | 100 GB | 8545, 8546, 30305 |
| Boost Node | 2 GB | 2 vCPU | 50 GB | 30306, 30307 |
| Validator Node | 2 GB | 2 vCPU | 50 GB | 30303 only |

**Supported OS:** Ubuntu 20.04/22.04/24.04 · Debian 11/12 · CentOS/RHEL/Rocky/AlmaLinux 8/9 · Fedora 38+

**Required:** Docker (installed automatically by the setup scripts)

---

## Port Reference

| Port | Protocol | Used by | Purpose |
|------|----------|---------|---------|
| 8545 | TCP | Litenode, RPC Node | JSON-RPC HTTP (wallets connect here) |
| 8546 | TCP | Litenode, RPC Node | WebSocket (eth_subscribe) |
| 30303 | TCP + UDP | Litenode, Validator | P2P peer discovery |
| 30305 | TCP + UDP | RPC Node | P2P networking |
| 30306 | TCP + UDP | Boost Node | P2P networking |
| 30307 | TCP + UDP | Boost Node | Boost relay port |
| 51820 | UDP | All (optional) | WireGuard VPN tunnel |
| 80/443 | TCP | All (optional) | Nginx reverse proxy / TLS |

---

## Node 1 — Litenode

**Repo:** https://github.com/hc172808/litenode  
**Role:** Lightweight sync node — used by the mobile app and browser wallet. Syncs headers only.

### Quick Install (one command)

```bash
# Clone the repo
git clone https://github.com/hc172808/litenode.git
cd litenode

# Run the setup script as root
sudo bash setup-litenode-server.sh
```

The script automatically:
- Updates the system and installs all dependencies
- Installs Go 1.22.4
- Installs and configures Docker
- Builds the `gyds-litenode` binary
- Sets up Nginx as a reverse proxy
- Configures UFW firewall and fail2ban
- Creates and starts the Docker container

### Manual .env Configuration

```bash
cp .env.example .env
nano .env
```

```env
GYDS_CHAIN_ID=13370
GYDS_NODE_MODE=lite

GYDS_RPC_PORT=8545
GYDS_RPC_HOST=0.0.0.0
GYDS_WS_PORT=8546
GYDS_P2P_PORT=30303

# Your domain name for SSL (optional — leave blank to skip TLS)
GYDS_DOMAIN=lite.yourdomain.com

GYDS_DATA_DIR=/app/data
GYDS_LOG_LEVEL=info

# Bootstrap peers — add your RPC/Boost node IPs here
# GYDS_BOOTSTRAP_NODES=tcp://YOUR_BOOST_IP:30306
```

### Start / Stop / Logs

```bash
# Docker (default)
cd /opt/gyds-litenode
docker compose up -d        # start
docker compose down         # stop
docker compose restart      # restart
docker compose logs -f      # live logs

# systemd (if --no-docker was used)
systemctl start gyds-litenode
systemctl stop gyds-litenode
systemctl status gyds-litenode
journalctl -fu gyds-litenode
```

### Firewall Setup (standalone)

```bash
sudo bash setup-firewall.sh
# Custom ports:
sudo bash setup-firewall.sh --ssh-port 22 --rpc-port 8545 --ws-port 8546 --p2p-port 30303
```

### WireGuard VPN (optional — private mesh between nodes)

```bash
sudo bash setup-wireguard.sh \
  --server-endpoint YOUR_VPN_SERVER_IP:51820 \
  --server-pubkey   YOUR_SERVER_PUBLIC_KEY \
  --client-vpn-ip   10.8.0.5/32
```

### Verify It's Running

```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Expected: {"result":"0x343a",...}
```

---

## Node 2 — RPC Node

**Repo:** https://github.com/hc172808/rpcnode  
**Role:** Full public JSON-RPC endpoint. This is what MetaMask, Trust Wallet, and dApps connect to.

### Quick Install (one command)

```bash
git clone https://github.com/hc172808/rpcnode.git
cd rpcnode
sudo bash setup-rpcnode-server.sh
```

### Install with Options

```bash
# With a domain for automatic TLS (recommended for production)
sudo bash setup-rpcnode-server.sh --domain rpc.yourdomain.com

# With bootstrap peers (point at your Boost Node)
sudo bash setup-rpcnode-server.sh \
  --domain rpc.yourdomain.com \
  --bootstrap-nodes tcp://YOUR_BOOST_IP:30306

# Custom ports
sudo bash setup-rpcnode-server.sh \
  --rpc-port 8545 \
  --ws-port  8546 \
  --p2p-port 30305

# Run as native systemd service (no Docker)
sudo bash setup-rpcnode-server.sh --no-docker
```

### Available Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--domain FQDN` | _(none)_ | Domain for auto-TLS via Certbot |
| `--rpc-port PORT` | 8545 | JSON-RPC HTTP port |
| `--ws-port PORT` | 8546 | WebSocket port |
| `--p2p-port PORT` | 30303 | P2P port |
| `--ssh-port PORT` | 22 | SSH port for firewall rules |
| `--datadir DIR` | `/var/lib/gyds-rpcnode` | Chain data directory |
| `--log-level LEVEL` | info | trace / debug / info / warn / error |
| `--bootstrap-nodes` | _(none)_ | Comma-separated peer list |
| `--no-docker` | _(Docker)_ | Use native systemd instead |
| `--update` | — | Update an existing install |
| `--uninstall` | — | Remove node (keeps chain data) |

### Manual .env Configuration

```bash
cp .env.example .env
nano .env
```

```env
GYDS_CHAIN_ID=13370
GYDS_NODE_MODE=full

GYDS_RPC_PORT=8545
GYDS_RPC_HOST=0.0.0.0
GYDS_WS_PORT=8546
GYDS_P2P_PORT=30305

# Your domain (if using TLS)
GYDS_DOMAIN=rpc.yourdomain.com

GYDS_DATA_DIR=/app/data
GYDS_LOG_LEVEL=info

# Point at your Boost Node
GYDS_BOOTSTRAP_NODES=tcp://YOUR_BOOST_IP:30306
```

### Start / Stop / Logs

```bash
# Docker (default)
cd /opt/gyds-rpcnode
docker compose up -d
docker compose logs -f
docker compose restart

# systemd
systemctl status gyds-rpcnode
journalctl -fu gyds-rpcnode
systemctl restart gyds-rpcnode

# Health check
gyds-rpcnode-health
```

### Update an Existing Install

```bash
sudo bash /opt/gyds-rpcnode/setup-rpcnode-server.sh --update
```

### Verify It's Running

```bash
# Chain ID check
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Expected: {"result":"0x343a",...}

# Block number check
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## Node 3 — Boost Node

**Repo:** https://github.com/hc172808/boostnode  
**Role:** Transaction relay and mempool boost. Sits between the RPC node and the validator. **RPC is localhost-only — do not expose port 8545 publicly.**

### Quick Install (one command)

```bash
git clone https://github.com/hc172808/boostnode.git
cd boostnode
sudo bash setup-boostnode-server.sh
```

The script detects your OS (Debian/Ubuntu/RHEL/Fedora/Amazon Linux), installs Go, Docker, and all dependencies, then starts the node.

### Manual .env Configuration

```bash
cp .env.example .env
nano .env
```

```env
GYDS_CHAIN_ID=13370
GYDS_NODE_MODE=boost

# RPC is localhost only — do NOT change to 0.0.0.0
GYDS_RPC_HOST=127.0.0.1
GYDS_RPC_PORT=8545

GYDS_P2P_PORT=30306
GYDS_BOOST_PORT=30307

GYDS_DATA_DIR=/app/data
GYDS_LOG_LEVEL=info

# Point at your Validator Node or another Boost Node
GYDS_BOOTSTRAP_NODES=tcp://YOUR_VALIDATOR_IP:30303
```

### Start / Stop / Logs

```bash
# Docker (default)
cd /opt/gyds-boostnode
docker compose up -d
docker compose down
docker compose restart
docker compose logs -f

# systemd
systemctl enable --now gyds-boostnode
systemctl restart gyds-boostnode
journalctl -fu gyds-boostnode
```

### After Setup — Note Your Peer String

After the script finishes it prints your bootstrap peer address:

```
GYDS_BOOTSTRAP_NODES=tcp://YOUR_PUBLIC_IP:30306
```

**Copy this value** — you'll add it to the RPC Node and Litenode `.env` files so they can find the Boost Node.

### Verify It's Running

```bash
# Health check (local only)
curl -sf http://localhost:8545/health && echo "OK"

# Peer count
curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
```

---

## Node 4 — Validator Node

**Repo:** https://github.com/hc172808/validatornode  
**Role:** PoS block producer. Signs and proposes blocks every 5 seconds.  
> ⚠️ **Security:** RPC port 8545 is bound to 127.0.0.1 **only**. Never expose it publicly. Never run this on the same machine as a public RPC node.

### Step 1 — Generate a Validator Key

Do this **before** running the setup script:

```bash
git clone https://github.com/hc172808/validatornode.git
cd validatornode

# Build locally to run keygen
make build

# Generate key
./bin/gyds-validatornode keygen
```

Or with Docker (no local Go needed):

```bash
docker run --rm $(docker build -q .) keygen
```

The output looks like:

```
Validator Address : 0xABCDEF1234567890...
Private Key (hex) : abcdef1234567890abcdef...   ← SAVE THIS SECURELY
```

> 🔑 **Store the private key securely.** Anyone with this key can sign blocks as your validator. Never commit it to git. Never share it.

### Step 2 — Run the Setup Script

**Option A — pass the key directly (easiest):**

```bash
sudo GYDS_VALIDATOR_KEY=YOUR_HEX_PRIVATE_KEY bash setup-validatornode-server.sh \
  --bootstrap-nodes tcp://YOUR_BOOST_IP:30306
```

**Option B — use a keystore file:**

```bash
# First generate and save the keystore
./bin/gyds-validatornode keygen --keystore /etc/gyds-validator/validator.json

# Then run setup pointing at the keystore
sudo bash setup-validatornode-server.sh \
  --keystore /etc/gyds-validator/validator.json \
  --bootstrap-nodes tcp://YOUR_BOOST_IP:30306
```

### Available Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--validator-key HEX` | _(required)_ | Hex private key for signing |
| `--keystore PATH` | _(alternative)_ | Path to keystore JSON file |
| `--p2p-port PORT` | 30303 | P2P port |
| `--rpc-port PORT` | 8545 | RPC port (localhost only) |
| `--ssh-port PORT` | 22 | SSH port for firewall |
| `--datadir DIR` | `/var/lib/gyds-validatornode` | Chain data directory |
| `--bootstrap-nodes` | _(none)_ | Comma-separated peer list |
| `--log-level LEVEL` | info | trace / debug / info / warn / error |
| `--no-docker` | _(Docker)_ | Use native systemd instead |
| `--update` | — | Update existing install |
| `--uninstall` | — | Remove node (keeps chain data) |

### Firewall Hardening (standalone)

```bash
sudo bash setup-firewall.sh
# This opens only SSH + P2P. RPC stays closed to the internet.
```

> ⚠️ The firewall script also **disables SSH password login**. Make sure your SSH public key is in `~/.ssh/authorized_keys` before running it.

### Start / Stop / Logs

```bash
# Docker (default)
cd /opt/gyds-validatornode
docker compose up -d
docker compose logs -f
docker compose restart

# systemd
journalctl -fu gyds-validatornode
systemctl restart gyds-validatornode
```

### Update an Existing Validator

```bash
sudo bash /opt/gyds-validatornode/setup-validatornode-server.sh --update
```

### Verify It's Signing Blocks

```bash
# Logs should show "New block" every 5 seconds
journalctl -fu gyds-validatornode | grep "New block"

# Or via Docker
cd /opt/gyds-validatornode && docker compose logs -f | grep "New block"
```

---

## Connecting Nodes Together

After all four nodes are installed, wire them together using `GYDS_BOOTSTRAP_NODES`.

### Step 1 — Get each node's public IP

```bash
curl -sf https://api.ipify.org
```

### Step 2 — Update each node's .env

**On the Boost Node** (`/opt/gyds-boostnode/.env`):
```env
GYDS_BOOTSTRAP_NODES=tcp://VALIDATOR_PUBLIC_IP:30303
```

**On the RPC Node** (`/opt/gyds-rpcnode/.env`):
```env
GYDS_BOOTSTRAP_NODES=tcp://BOOST_PUBLIC_IP:30306
```

**On the Litenode** (`/opt/gyds-litenode/.env`):
```env
GYDS_BOOTSTRAP_NODES=tcp://RPC_PUBLIC_IP:30305,tcp://BOOST_PUBLIC_IP:30306
```

### Step 3 — Restart each node after editing .env

```bash
# Docker
cd /opt/gyds-NODENAME && docker compose down && docker compose up -d

# systemd
systemctl restart gyds-NODENAME
```

### Step 4 — Confirm peers are connected

```bash
curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
# Result should be > 0
```

---

## Monitoring (Grafana + Prometheus)

The RPC node repo includes a full monitoring stack.

```bash
cd /opt/gyds-rpcnode/grafana

# Start Prometheus + Grafana
docker compose -f docker-compose.monitoring.yml up -d
```

Then open:
- **Grafana:** `http://YOUR_SERVER_IP:3000` — login: `admin` / `gydschain`
- **Prometheus:** `http://YOUR_SERVER_IP:9090`

Import the dashboard:
1. Grafana → **Dashboards** → **Import**
2. Upload `grafana/gyds-dashboard.json`

---

## MetaMask / Trust Wallet Setup

Once your RPC Node is running, add the network to any wallet:

| Field | Value |
|-------|-------|
| Network Name | GYDS Chain |
| Chain ID | 13370 |
| RPC URL | `http://YOUR_RPC_IP:8545` or `https://rpc.yourdomain.com` |
| WebSocket | `ws://YOUR_RPC_IP:8546` or `wss://rpc.yourdomain.com/api/ws` |
| Currency Symbol | GYDS |
| Decimals | 18 |
| Block Explorer | _(optional — add your own)_ |

---

## Common Management Commands

### View logs

```bash
# Docker
cd /opt/gyds-NODENAME && docker compose logs -f --tail=100

# systemd
journalctl -fu gyds-NODENAME --since "1 hour ago"
```

### Check running containers

```bash
docker ps | grep gyds
```

### Restart a node

```bash
# Docker
cd /opt/gyds-NODENAME && docker compose restart

# systemd
systemctl restart gyds-NODENAME
```

### Check firewall bans

```bash
sudo bash /opt/gyds-NODENAME/setup-firewall.sh --status
```

### Unban an IP

```bash
sudo bash /opt/gyds-NODENAME/setup-firewall.sh --unban 1.2.3.4
```

### Update a node

```bash
sudo bash /opt/gyds-NODENAME/setup-NODENAME-server.sh --update
```

### Remove a node (keeps chain data)

```bash
sudo bash /opt/gyds-NODENAME/setup-NODENAME-server.sh --uninstall
```

---

## Troubleshooting

### RPC returns connection refused

1. Check the container is running: `docker ps | grep gyds`
2. Check logs for errors: `docker compose logs -f`
3. Check the firewall allows the port: `ufw status | grep 8545`

### No peers connecting (net_peerCount = 0)

1. Confirm `GYDS_BOOTSTRAP_NODES` is set in `.env` and the node was restarted after
2. Confirm the P2P port is open: `ufw status | grep 3030`
3. Test reachability from another server: `nc -vz REMOTE_IP 30303`

### Validator is not producing blocks

1. Check the private key was loaded: `docker compose logs | grep -i "validator\|key"`
2. Confirm it's peered to at least one other node (`net_peerCount > 0`)
3. Make sure the validator address is in the genesis validator set

### Disk space growing fast (RPC Node)

```bash
# Check data dir size
du -sh /var/lib/gyds-rpcnode/

# Docker logs cap is already set to 100 MB / 7 files in docker-compose.yml
# To trim manually:
docker system prune -f
```

### Biometric / SSH locked out (Validator firewall)

The validator firewall script disables SSH password login. If you're locked out:
- Use your hosting provider's console / rescue mode
- Re-add your SSH public key: `echo "YOUR_PUBKEY" >> ~/.ssh/authorized_keys`
- Then re-enable SSH: `systemctl restart sshd`

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│  GYDS Chain Node Quick Reference                    │
│                                                     │
│  Litenode      github.com/hc172808/litenode         │
│    Install:    sudo bash setup-litenode-server.sh   │
│    Ports:      8545 (RPC), 8546 (WS), 30303 (P2P)  │
│                                                     │
│  RPC Node      github.com/hc172808/rpcnode          │
│    Install:    sudo bash setup-rpcnode-server.sh    │
│    Ports:      8545 (RPC), 8546 (WS), 30305 (P2P)  │
│                                                     │
│  Boost Node    github.com/hc172808/boostnode        │
│    Install:    sudo bash setup-boostnode-server.sh  │
│    Ports:      30306 (P2P), 30307 (Relay)           │
│    Note:       RPC 8545 is localhost only           │
│                                                     │
│  Validator     github.com/hc172808/validatornode    │
│    Keygen:     ./bin/gyds-validatornode keygen      │
│    Install:    sudo GYDS_VALIDATOR_KEY=HEX \        │
│                  bash setup-validatornode-server.sh │
│    Ports:      30303 (P2P only)                     │
│    Note:       RPC 8545 is localhost only           │
│                                                     │
│  Chain ID: 13370   Symbol: GYDS   Decimals: 18      │
└─────────────────────────────────────────────────────┘
```
