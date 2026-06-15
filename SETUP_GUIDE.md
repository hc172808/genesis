# GYDS Chain — Complete Setup & Wallet Guide

> **Network at a glance**
>
> | Field | Value |
> |---|---|
> | Network Name | GYDS Chain |
> | Chain ID | 13370 |
> | Chain ID (Hex) | 0x343A |
> | Currency Symbol | GYDS |
> | Decimals | 18 |
> | RPC Port | 8545 |
> | WebSocket Port | 8546 |
> | P2P Port | 30303 |
> | Boost P2P Port | 30306 |
> | Boost Relay Port | 30307 |

---

## Do you need nginx + TLS (HTTPS)?

**Short answer: No — not for your genesis/internal nodes.**

| Situation | Need HTTPS? |
|---|---|
| Genesis node behind firewall, other nodes connect to it | ❌ Plain HTTP is fine |
| Full node / litenode used only internally | ❌ Not needed |
| RPC node exposed publicly so MetaMask users connect from the internet | ✅ Yes — add `DOMAIN=rpc.yourdomain.com` and TLS is handled automatically |
| Trust Wallet on mobile connecting to your RPC | ✅ Yes — mobile wallets require HTTPS |

All your setup scripts already include **nginx + Certbot** built in. To activate TLS, just set the `DOMAIN` variable before running the setup script — no separate nginx config needed.

---

## Step 1 — Run Genesis Init (once, on the genesis machine)

```bash
bash genesis-init.sh \
  --chain-id 13370 \
  --validators 3 \
  --rpc-url http://YOUR_RPC_NODE_IP:8545 \
  --ws-url  ws://YOUR_RPC_NODE_IP:8546
```

This creates `data/genesis/` containing:
- `genesis.json` — the genesis block **(copy this to every node operator)**
- `wallet-config.json` — pre-filled values for MetaMask / Trust Wallet
- `network.env` — source this before running node scripts

> The genesis node stays behind your firewall. Only `genesis.json` needs to leave it.

---

## Step 2 — Add GYDS Chain to MetaMask

### Desktop (Browser Extension)

1. Click the **network dropdown** at the top of MetaMask (shows current network)
2. Click **Add network** → **Add a network manually**
3. Fill in:

   | Field | Value |
   |---|---|
   | Network Name | `GYDS Chain` |
   | New RPC URL | `http://YOUR_RPC_NODE_IP:8545` |
   | Chain ID | `13370` |
   | Currency Symbol | `GYDS` |
   | Block Explorer URL | *(leave blank for now)* |

4. Click **Save** — MetaMask switches to GYDS Chain automatically

### Mobile (MetaMask App)

1. Tap **☰** (menu) → **Settings** → **Networks** → **Add Network**
2. Enter the same values as above
3. Tap **Add**

> **Tip:** Your balance shows `0 GYDS` until the chain is producing blocks and your address has been funded.

---

## Step 3 — Add GYDS Chain to Trust Wallet

Trust Wallet on mobile **requires HTTPS** for RPC. Your internal nodes use HTTP, so you have two options:

**Option A — Use a public RPC node with TLS** (recommended for Trust Wallet)
Deploy your RPC/fullnode with a domain:
```bash
DOMAIN=rpc.yourdomain.com sudo bash setup-fullnode-server.sh
```
Then use `https://rpc.yourdomain.com` as the RPC URL in Trust Wallet.

**Option B — Use your phone on the same network**
If your phone is on the same LAN/VPN as the node, plain `http://` may work.

### Trust Wallet Steps

1. Open Trust Wallet → **Settings** (bottom right cog)
2. Tap **Networks** → **Add Custom Network**
3. Fill in:

   | Field | Value |
   |---|---|
   | Name | `GYDS Chain` |
   | Short Name | `GYDS` |
   | RPC URL | `https://rpc.yourdomain.com` *(or http:// on same LAN)* |
   | Chain ID | `13370` |
   | Symbol | `GYDS` |
   | Decimals | `18` |
   | Explorer | *(optional — add later)* |

4. Tap **Done / Save**

---

## Step 4 — Node Setup

> All setup scripts run on **Ubuntu 20.04/22.04/24.04** and most also support Debian, CentOS/RHEL/Rocky/AlmaLinux, Amazon Linux, and Fedora.
> Every script must be run as **root** (`sudo bash ...`).

Distribute `genesis.json` to each machine first, then pick the node type below.

---

### Boost Node — Start this first
Handles peer discovery and block propagation. Other nodes point their `GYDS_BOOTSTRAP_NODES` here.

```bash
git clone https://github.com/hc172808/boostnode
cd boostnode
sudo bash setup-boostnode-server.sh
```

**Override ports with env vars (no CLI flags on this script):**
```bash
sudo GYDS_P2P_PORT=30306 GYDS_BOOST_PORT=30307 bash setup-boostnode-server.sh
```

**Ports opened automatically:**

| Port | Protocol | Purpose |
|---|---|---|
| 30306 | TCP + UDP | P2P peer networking |
| 30307 | TCP + UDP | Boost relay |
| 8545 | TCP | RPC — **localhost only**, not public |

**After setup, note your boost node's address:**
```
GYDS_BOOTSTRAP_NODES=tcp://YOUR_BOOST_NODE_IP:30306
```
All other nodes need this value in their `.env`.

**Management commands:**
```bash
cd /opt/gyds-boostnode && docker compose logs -f      # live logs
docker compose restart                                 # restart
systemctl enable --now gyds-boostnode                 # switch to native (no Docker)
journalctl -fu gyds-boostnode                         # native logs
```

---

### Lite Node
Syncs block headers only — lightweight, fast to start. Good as an entry-point node or wallet endpoint on your LAN.

```bash
git clone https://github.com/hc172808/litenode
cd litenode
sudo bash setup-litenode-server.sh
```

**To enable TLS / HTTPS (needed for Trust Wallet from internet):**
```bash
sudo DOMAIN=rpc.yourdomain.com bash setup-litenode-server.sh
```

**To set bootstrap peers (point at your boost node):**
```bash
sudo GYDS_BOOTSTRAP_NODES="tcp://YOUR_BOOST_NODE_IP:30306" bash setup-litenode-server.sh
```

**Ports opened automatically:**

| Port | Protocol | Purpose |
|---|---|---|
| 8545 | TCP | JSON-RPC HTTP — use this in MetaMask |
| 8546 | TCP | WebSocket |
| 30303 | TCP + UDP | P2P networking |
| 80 | TCP | Nginx reverse proxy → 8545 |
| 443 | TCP | HTTPS *(only when DOMAIN is set)* |

**Management commands (installed globally):**
```bash
gyds-health           # check node status, block height, disk
sudo gyds-update      # pull latest code and rebuild
cd /opt/gyds-litenode && docker compose logs -f    # live logs
docker compose restart                              # restart
```

---

### Full Node
Downloads and verifies the entire chain. Recommended as your main RPC endpoint and for any serious use.

```bash
git clone https://github.com/hc172808/fullnode
cd fullnode
sudo bash setup-fullnode-server.sh
```

**Common options:**
```bash
# With a domain for HTTPS (required for Trust Wallet)
sudo bash setup-fullnode-server.sh --domain rpc.yourdomain.com

# With bootstrap peers
sudo bash setup-fullnode-server.sh \
  --bootstrap-nodes tcp://YOUR_BOOST_NODE_IP:30306

# Custom ports
sudo bash setup-fullnode-server.sh \
  --rpc-port 8545 --ws-port 8546 --p2p-port 30303

# Non-Docker (runs as native systemd service)
sudo bash setup-fullnode-server.sh --no-docker

# Restrict RPC to specific IPs only
sudo bash setup-fullnode-server.sh --allow-ip 192.168.1.50

# All options
sudo bash setup-fullnode-server.sh --help
```

**Update an existing install:**
```bash
sudo bash /opt/gyds-fullnode/setup-fullnode-server.sh --update
```

**Uninstall (preserves chain data):**
```bash
sudo bash /opt/gyds-fullnode/setup-fullnode-server.sh --uninstall
```

**Ports opened automatically:**

| Port | Protocol | Purpose |
|---|---|---|
| 8545 | TCP | JSON-RPC HTTP — use this in MetaMask |
| 8546 | TCP | WebSocket |
| 30303 | TCP + UDP | P2P networking |
| 80 | TCP | Nginx reverse proxy → 8545 |
| 443 | TCP | HTTPS *(only when --domain is used)* |

**Management commands:**
```bash
# Docker mode (default)
cd /opt/gyds-fullnode
docker compose ps                    # status
docker compose logs -f               # live logs
docker compose restart               # restart

# Native systemd mode (when --no-docker was used)
systemctl status gyds-fullnode
journalctl -u gyds-fullnode -f
systemctl restart gyds-fullnode

# Health check (runs automatically every 5 min via cron)
/usr/local/bin/gyds-fullnode-health
cat /var/lib/gyds-fullnode/logs/health.log
```

---

## Step 5 — Recommended Node Startup Order

```
1. Genesis node  →  run genesis-init.sh (stays behind firewall)
2. Boost node    →  first public node, handles peer discovery
3. Full node(s)  →  sync chain, expose RPC endpoint
4. Lite node(s)  →  lightweight wallet/query endpoints
```

Once your full node is live, point MetaMask at it:
- **RPC URL:** `http://YOUR_FULLNODE_IP:8545` (or `https://` if you set `--domain`)

---

## Step 6 — Verify the Chain is Live

Run these from any machine to confirm your RPC node is working:

```bash
RPC="http://YOUR_RPC_NODE_IP:8545"

# Should return "0x343a" (Chain ID 13370 in hex)
curl -s -X POST $RPC \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Should return "0x0" at genesis, increases as blocks are produced
curl -s -X POST $RPC \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Should be > 0 once other nodes connect
curl -s -X POST $RPC \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
```

Expected responses:
| RPC Method | Expected Result |
|---|---|
| `eth_chainId` | `"result": "0x343a"` |
| `eth_blockNumber` | `"result": "0x0"` at start, increases over time |
| `net_peerCount` | `"result": "0x1"` or higher |

---

## Firewall Quick Reference

```bash
# Full node or litenode (public RPC)
sudo ufw allow 8545/tcp    # JSON-RPC — MetaMask / Trust Wallet
sudo ufw allow 8546/tcp    # WebSocket
sudo ufw allow 30303/tcp   # P2P
sudo ufw allow 30303/udp   # P2P discovery

# Boost node (no public RPC)
sudo ufw allow 30306/tcp
sudo ufw allow 30306/udp
sudo ufw allow 30307/tcp
sudo ufw allow 30307/udp

# Genesis node (stays behind firewall — open nothing publicly)
# Only open port 30303 if you want it to peer with other nodes directly

# View open ports
sudo ufw status numbered
```

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| MetaMask: "Could not fetch chain ID" | RPC not reachable | Check `ufw status`, confirm node is running: `docker compose ps` |
| MetaMask shows wrong network | Chain ID typed wrong | Confirm you entered `13370` (not `1337` or `13370` with extra zeros) |
| Trust Wallet can't connect | HTTPS required | Set `DOMAIN=` and re-run setup, or use `--domain` flag on fullnode |
| No peers connecting | P2P port blocked | Open 30303 TCP+UDP; ensure boost node is running and its IP is in `GYDS_BOOTSTRAP_NODES` |
| Balance shows 0 after genesis | Address not in alloc | Re-run genesis init and add your address to the alloc section |
| Container keeps restarting | Build or config error | Run `docker compose logs -f` in the node's app directory |
| Boost node RPC not reachable | Expected — by design | Boost node RPC is localhost-only; use fullnode or litenode for wallet RPC |

---

## `.env` Variables Reference

These can be set before running any setup script or edited in `APP_DIR/.env` afterwards:

| Variable | Default | Used by |
|---|---|---|
| `GYDS_CHAIN_ID` | `13370` | All nodes |
| `GYDS_RPC_PORT` | `8545` | Litenode, Fullnode |
| `GYDS_WS_PORT` | `8546` | Fullnode |
| `GYDS_P2P_PORT` | `30303` (lite/full), `30306` (boost) | All nodes |
| `GYDS_BOOST_PORT` | `30307` | Boostnode only |
| `GYDS_DATA_DIR` | varies per node | All nodes |
| `GYDS_LOG_LEVEL` | `info` | All nodes (`trace`\|`debug`\|`info`\|`warn`\|`error`) |
| `GYDS_BOOTSTRAP_NODES` | *(empty)* | All nodes — set to `tcp://BOOST_IP:30306` |
| `DOMAIN` | *(empty)* | Litenode — set to enable auto-TLS via Certbot |
