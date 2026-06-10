# GYDS Chain — RPC Node

A dedicated **JSON-RPC + WebSocket** endpoint for the [GYDS Chain](https://github.com/hc172808) (Chain ID: **13370**).

Connect MetaMask, Trust Wallet, dApps, and block explorers to this node. It syncs chain state via P2P but does **not** produce blocks — all resources are dedicated to serving RPC requests reliably.

---

## Table of Contents

- [Requirements](#requirements)
- [Quick Start (Docker)](#quick-start-docker)
- [Connect a Wallet](#connect-a-wallet)
- [Environment Variables](#environment-variables)
- [Server Setup (Automated)](#server-setup-automated)
- [Manual Build](#manual-build)
- [API Reference](#api-reference)
- [Ports & Firewall](#ports--firewall)
- [Node Monitoring](#node-monitoring)
- [Nginx + TLS Setup](#nginx--tls-setup)
- [Updating](#updating)

---

## Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 20.04 / Debian 11 | Ubuntu 22.04 LTS |
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 16 GB |
| Disk | 50 GB SSD | 500 GB NVMe |
| Network | 100 Mbps | 1 Gbps with static IP |

**Software:** Docker + Docker Compose **or** Go 1.21+

---

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/hc172808/rpcnode.git
cd rpcnode

# 2. Configure environment
cp .env.example .env
# Edit .env if needed (defaults work out of the box)

# 3. Start the node
docker compose up -d

# 4. Verify it's running
curl http://localhost:8545/health
# {"mode":"rpc","status":"ok","height":0}

# 5. Test JSON-RPC
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# {"jsonrpc":"2.0","result":"0x343a","id":1}
```

---

## Connect a Wallet

### MetaMask

1. Open MetaMask → Click the network dropdown → **Add a network** → **Add a network manually**
2. Fill in:

| Field | Value |
|---|---|
| Network Name | GYDS Chain |
| New RPC URL | `http://YOUR_SERVER_IP:8545` |
| Chain ID | `13370` |
| Currency Symbol | `GYDS` |
| Block Explorer URL | *(optional)* |

3. Click **Save** → MetaMask switches to GYDS Chain.

> **TLS required for HTTPS wallets:** If your wallet requires an `https://` URL, run the setup script with `--domain your.domain.com` to provision a free Certbot certificate.

### Trust Wallet

1. Open Trust Wallet → Settings → Networks → **+** (Add Custom Network)
2. Fill in:

| Field | Value |
|---|---|
| Name | GYDS Chain |
| RPC URL | `https://rpc.yourdomain.com` (TLS) or `http://YOUR_IP:8545` |
| Chain ID | `13370` |
| Symbol | `GYDS` |
| Decimals | `18` |

3. Tap **Save**.

> Trust Wallet may require an `https://` RPC URL on mobile. Use the `--domain` flag when running the setup script to enable automatic TLS.

### Wagmi / ethers.js / viem (dApps)

```javascript
// ethers.js v6
import { JsonRpcProvider } from "ethers";
const provider = new JsonRpcProvider("http://YOUR_SERVER_IP:8545");

// viem
import { createPublicClient, http } from "viem";
const client = createPublicClient({
  chain: { id: 13370, name: "GYDS Chain", nativeCurrency: { name: "GYDS", symbol: "GYDS", decimals: 18 } },
  transport: http("http://YOUR_SERVER_IP:8545"),
});

// WebSocket subscription (real-time blocks)
import { createPublicClient, webSocket } from "viem";
const wsClient = createPublicClient({
  chain: { id: 13370, name: "GYDS Chain", nativeCurrency: { name: "GYDS", symbol: "GYDS", decimals: 18 } },
  transport: webSocket("ws://YOUR_SERVER_IP:8546"),
});
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```dotenv
# Chain
GYDS_CHAIN_ID=13370
GYDS_NODE_MODE=rpc

# Networking
GYDS_RPC_PORT=8545          # JSON-RPC HTTP port
GYDS_RPC_HOST=0.0.0.0       # bind to all interfaces
GYDS_WS_PORT=8546           # WebSocket port
GYDS_P2P_PORT=30303         # P2P peer port

# CORS (comma-separated origins, * = allow all)
GYDS_CORS_ORIGINS=*

# Bootstrap peers (comma-separated)
# GYDS_BOOTSTRAP_NODES=tcp://BOOST_NODE_IP:30306

# Storage
GYDS_DATA_DIR=/app/data

# Logging
GYDS_LOG_LEVEL=info         # trace | debug | info | warn | error
```

---

## Server Setup (Automated)

The included setup script installs Docker, Nginx (with rate limiting), optional TLS via Certbot, UFW firewall rules, a health-check cron job, and starts the RPC node.

```bash
# Basic setup (HTTP)
sudo bash setup-rpcnode-server.sh

# With TLS — DNS must point to this server first
sudo bash setup-rpcnode-server.sh --domain rpc.yourdomain.com

# With bootstrap peers
sudo bash setup-rpcnode-server.sh \
  --bootstrap-nodes tcp://BOOST_NODE_IP:30306

# All options
sudo bash setup-rpcnode-server.sh \
  --rpc-port 8545              \
  --ws-port  8546              \
  --domain   rpc.yourdomain.com \
  --bootstrap-nodes tcp://1.2.3.4:30303
```

### Supported operating systems

| OS | Versions |
|---|---|
| Ubuntu | 20.04, 22.04, 24.04 |
| Debian | 11 (Bullseye), 12 (Bookworm) |
| CentOS / RHEL | 8, 9 |
| Rocky Linux | 8, 9 |
| AlmaLinux | 8, 9 |
| Fedora | 38+ |

### Options

```
--rpc-port  PORT   JSON-RPC HTTP port              (default: 8545)
--ws-port   PORT   WebSocket port                  (default: 8546)
--p2p-port  PORT   P2P networking port             (default: 30303)
--ssh-port  PORT   SSH port for firewall            (default: 22)
--datadir   DIR    Chain data directory             (default: /var/lib/gyds-rpcnode)
--domain    FQDN   Domain for auto-TLS (Certbot)
--log-level LEVEL  trace|debug|info|warn|error
--bootstrap-nodes  Comma-separated peer list
--no-docker        Use native systemd instead of Docker
--update           Update an existing installation
--uninstall        Remove the node (preserves chain data)
```

After setup the script prints:

```
╔══════════════════════════════════════════════════════════╗
║              GYDS RPC NODE DEPLOYED                      ║
╚══════════════════════════════════════════════════════════╝

  JSON-RPC  : http://1.2.3.4:8545
  WebSocket : ws://1.2.3.4:8546
  P2P       : tcp://1.2.3.4:30303

  ── MetaMask / Trust Wallet ──────────────────────────────
  Network Name : GYDS Chain
  Chain ID     : 13370
  RPC URL      : http://1.2.3.4:8545
  Symbol       : GYDS  |  Decimals: 18
```

---

## Manual Build

```bash
# Install Go 1.21+ from https://go.dev/dl/

git clone https://github.com/hc172808/rpcnode.git
cd rpcnode

# Build
make build
# Binary: bin/gyds-rpcnode

# Start
./bin/gyds-rpcnode start

# Or with custom ports
GYDS_RPC_PORT=8545 GYDS_WS_PORT=8546 ./bin/gyds-rpcnode start
```

---

## API Reference

The RPC node implements the standard Ethereum JSON-RPC spec. All requests go to `POST /` or `POST /rpc`.

### Supported Methods

#### Network

| Method | Description |
|---|---|
| `eth_chainId` | Returns `0x343a` (13370) |
| `eth_blockNumber` | Latest block number |
| `net_version` | Chain ID as string |
| `net_listening` | Always `true` |
| `net_peerCount` | Connected peer count |
| `eth_syncing` | Sync status |
| `web3_clientVersion` | Node version string |

#### Blocks

| Method | Description |
|---|---|
| `eth_getBlockByNumber` | Block by number (or `"latest"`) |
| `eth_getBlockByHash` | Block by hash |
| `eth_getBlockTransactionCountByNumber` | Tx count in block |
| `eth_getBlockTransactionCountByHash` | Tx count by block hash |

#### Accounts

| Method | Description |
|---|---|
| `eth_getBalance` | GYDS balance in wei |
| `eth_getTransactionCount` | Nonce for address |
| `eth_getCode` | Contract code (`0x` for EOAs) |
| `eth_getStorageAt` | Storage slot value |

#### Transactions

| Method | Description |
|---|---|
| `eth_sendRawTransaction` | Submit signed transaction |
| `eth_getTransactionByHash` | Transaction by hash |
| `eth_getTransactionReceipt` | Receipt by tx hash |
| `eth_call` | Simulate a call |
| `eth_estimateGas` | Returns `0x5208` (21000) |

#### Gas

| Method | Description |
|---|---|
| `eth_gasPrice` | Returns `0x3B9ACA00` (1 gwei) |
| `eth_maxPriorityFeePerGas` | Returns `0x3B9ACA00` |
| `eth_feeHistory` | Fee history data |

#### Filters / Subscriptions

| Method | Description |
|---|---|
| `eth_newFilter` | Create log filter |
| `eth_newBlockFilter` | Block filter |
| `eth_getFilterChanges` | Poll filter changes |
| `eth_uninstallFilter` | Remove filter |
| `eth_subscribe` | WebSocket subscription |
| `eth_getLogs` | Query event logs |

### REST API

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | `{"status":"ok","mode":"rpc","height":N}` |
| `/api/status` | GET | Chain stats (height, chainId, etc.) |
| `/api/blocks` | GET | Recent blocks (`?limit=N`, max 100) |
| `/api/blocks/{id}` | GET | Block by number or hash |
| `/api/transactions` | GET | Recent transactions (`?limit=N`) |
| `/api/transactions/{hash}` | GET | Transaction by hash |
| `/api/accounts/{address}` | GET | Balance and nonce for address |
| `/api/peers` | GET | Connected peers |
| `/api/ws` | WS | WebSocket — subscribe to new blocks |

### Example Requests

```bash
SERVER=http://YOUR_SERVER_IP:8545

# Chain ID
curl -s -X POST $SERVER \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Latest block number
curl -s -X POST $SERVER \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Balance of an address
curl -s -X POST $SERVER \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xYOUR_ADDRESS","latest"],"id":1}'

# Latest block details (REST)
curl -s $SERVER/api/blocks | jq .blocks[0]

# Account info (REST)
curl -s $SERVER/api/accounts/0xYOUR_ADDRESS | jq .

# Batch request
curl -s -X POST $SERVER \
  -H "Content-Type: application/json" \
  --data '[
    {"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1},
    {"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":2},
    {"jsonrpc":"2.0","method":"net_version","params":[],"id":3}
  ]'
```

### WebSocket Example

```javascript
const ws = new WebSocket("ws://YOUR_SERVER_IP:8546");

ws.onopen = () => {
  ws.send(JSON.stringify({
    jsonrpc: "2.0",
    method: "eth_subscribe",
    params: ["newHeads"],
    id: 1
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("New block:", data);
};
```

---

## Ports & Firewall

| Port | Protocol | Purpose |
|---|---|---|
| **8545** | TCP | JSON-RPC HTTP — wallets and dApps |
| **8546** | TCP | WebSocket — real-time subscriptions |
| **30303** | TCP + UDP | P2P peer discovery and block sync |
| **80** | TCP | Nginx HTTP (set up by setup script) |
| **443** | TCP | Nginx HTTPS / TLS (if `--domain` used) |

```bash
sudo ufw allow 8545/tcp   comment "GYDS RPC"
sudo ufw allow 8546/tcp   comment "GYDS WebSocket"
sudo ufw allow 30303/tcp  comment "GYDS P2P"
sudo ufw allow 30303/udp  comment "GYDS P2P UDP"
sudo ufw allow 80/tcp     comment "HTTP"
sudo ufw allow 443/tcp    comment "HTTPS"
```

---

## Node Monitoring

```bash
# Docker logs
docker compose logs -f
docker compose ps

# Systemd logs
journalctl -u gyds-rpcnode -f
systemctl status gyds-rpcnode

# Health endpoint
curl -s http://localhost:8545/health
# {"mode":"rpc","status":"ok","height":12345}

# Chain stats
curl -s http://localhost:8545/api/status | jq .

# Manual health check
gyds-rpcnode-health
```

The setup script installs an automatic health cron every 5 minutes that restarts the node if RPC stops responding.

---

## Nginx + TLS Setup

The setup script configures Nginx as a reverse proxy with:

- **Rate limiting:** 30 req/s per IP with burst of 60
- **WS connection limit:** 10 concurrent WebSocket connections per IP
- **Timeouts:** 5 min for long-polling, 1 hr for WebSocket
- **CORS:** All origins allowed by default

If you ran the script with `--domain`, Certbot automatically:
1. Issues a free Let's Encrypt certificate
2. Configures HTTPS redirect
3. Sets up auto-renewal (cron at 3am daily)

Your wallet RPC URL becomes:
```
https://rpc.yourdomain.com
wss://rpc.yourdomain.com/api/ws
```

---

## Updating

```bash
# With the setup script
sudo bash /opt/gyds-rpcnode/setup-rpcnode-server.sh --update

# Manually with Docker
cd /opt/gyds-rpcnode
git pull origin main
docker compose build --no-cache
docker compose up -d

# Manually without Docker
cd /opt/gyds-rpcnode
git pull origin main
make build
systemctl restart gyds-rpcnode
```

---

## Related Repos

| Repo | Description |
|---|---|
| [fullnode](https://github.com/hc172808/fullnode) | Full blockchain node with RPC |
| [litenode](https://github.com/hc172808/litenode) | Lightweight sync node |
| [boostnode](https://github.com/hc172808/boostnode) | High-throughput relay node |
| [validatornode](https://github.com/hc172808/validatornode) | PoS block producer |

---

**Chain ID:** 13370 · **Symbol:** GYDS · **Decimals:** 18 · **Block Time:** 5s
