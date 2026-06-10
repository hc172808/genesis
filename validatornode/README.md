# GYDS Chain — Validator Node

A Proof-of-Stake validator node for the [GYDS Chain](https://github.com/hc172808) (Chain ID: **13370**).

When selected as the epoch proposer, this node signs and commits blocks to the chain. It connects to the wider network via P2P and exposes a **localhost-only** JSON-RPC endpoint for monitoring.

---

## Table of Contents

- [Requirements](#requirements)
- [Quick Start (Docker)](#quick-start-docker)
- [Key Generation](#key-generation)
- [Environment Variables](#environment-variables)
- [Server Setup (Automated)](#server-setup-automated)
- [Manual Build](#manual-build)
- [Validator Registration](#validator-registration)
- [Ports & Firewall](#ports--firewall)
- [Node Monitoring](#node-monitoring)
- [Updating](#updating)
- [Security Best Practices](#security-best-practices)

---

## Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 20.04 / Debian 11 | Ubuntu 22.04 LTS |
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 50 GB SSD | 200 GB NVMe |
| Network | 10 Mbps | 100 Mbps with static IP |

**Software:** Docker + Docker Compose **or** Go 1.21+

---

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/hc172808/validatornode.git
cd validatornode

# 2. Generate your validator key
docker run --rm gyds-validatornode keygen
# ── or build first, then: ──────────────────────────
make build && ./bin/gyds-validatornode keygen

# Output:
#   Validator address : 0xYOURADDRESS
#   Private key (hex) : abc123...

# 3. Set up your environment
cp .env.example .env
nano .env   # set GYDS_VALIDATOR_KEY=abc123...

# 4. Start the node
docker compose up -d

# 5. Check it's running
docker compose logs -f
```

---

## Key Generation

Your validator identity is an **ECDSA key pair**. The address derived from it must be registered in the validator set to propose blocks.

### Generate a new key

```bash
# With Docker
docker run --rm $(docker build -q .) keygen

# Or with the binary
./bin/gyds-validatornode keygen
```

Output:
```
Validator address : 0x1a2b3c4d5e6f...
Private key (hex) : 64hexcharsprivatekeyhere...

Store the private key safely.
Set GYDS_VALIDATOR_KEY=<hex> in your .env before starting.
```

> **Keep your private key secret.** Anyone who has it can sign blocks on your behalf. Never commit it to git or share it in plain text.

### Save as keystore file (optional)

The binary can load your key from a JSON keystore file instead of a raw hex env var:

```bash
# Start node with keystore
GYDS_KEYSTORE_PATH=/app/keystore/validator.json \
GYDS_KEYSTORE_PASSWORD=yourpassword \
./bin/gyds-validatornode start
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```dotenv
# Chain
GYDS_CHAIN_ID=13370
GYDS_NODE_MODE=validator

# Validator Key — choose ONE:
GYDS_VALIDATOR_KEY=your64hexcharprivatekeyhere
# GYDS_KEYSTORE_PATH=/app/keystore/validator.json
# GYDS_KEYSTORE_PASSWORD=your-keystore-password

# Networking
GYDS_RPC_PORT=8545          # localhost only — do NOT expose publicly
GYDS_RPC_HOST=127.0.0.1
GYDS_P2P_PORT=30303

# Bootstrap peers (comma-separated)
# GYDS_BOOTSTRAP_NODES=tcp://BOOST_NODE_IP:30306

# Storage
GYDS_DATA_DIR=/app/data

# Logging
GYDS_LOG_LEVEL=info         # trace | debug | info | warn | error
```

---

## Server Setup (Automated)

The included setup script installs Docker, configures the firewall, clones this repo, and starts the node as a managed service.

```bash
# With validator key (hex)
sudo GYDS_VALIDATOR_KEY=abc123... bash setup-validatornode-server.sh

# With keystore file
sudo bash setup-validatornode-server.sh \
  --keystore /path/to/validator.json

# With all options
sudo bash setup-validatornode-server.sh \
  --validator-key abc123...            \
  --bootstrap-nodes tcp://1.2.3.4:30303 \
  --p2p-port 30303                     \
  --log-level info
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
--datadir       DIR    Chain data directory      (default: /var/lib/gyds-validatornode)
--keystore      PATH   Path to keystore JSON file
--validator-key HEX    Raw hex private key
--p2p-port      PORT   P2P port                  (default: 30303)
--rpc-port      PORT   RPC port (localhost only)  (default: 8545)
--ssh-port      PORT   SSH port for firewall      (default: 22)
--bootstrap-nodes      Comma-separated peer list
--log-level     LEVEL  trace|debug|info|warn|error
--no-docker            Use native systemd instead of Docker
--update               Update an existing installation
--uninstall            Remove the node (preserves chain data)
```

---

## Manual Build

```bash
# Install Go 1.21+ from https://go.dev/dl/

git clone https://github.com/hc172808/validatornode.git
cd validatornode

# Build
make build
# Binary: bin/gyds-validatornode

# Generate a key
make keygen

# Start
GYDS_VALIDATOR_KEY=abc123... ./bin/gyds-validatornode start

# Print genesis block
./bin/gyds-validatornode genesis
```

---

## Validator Registration

To be selected as a block proposer, your validator address must be in the chain's **validator set**.

### Step 1 — Generate your key and get your address

```bash
./bin/gyds-validatornode keygen
```

Note your **Validator address** (e.g. `0x1a2b3c4d...`).

### Step 2 — Register with the GYDS Chain team

Send your validator address to the GYDS Chain governance channel or submit a pull request to add your address to `core/genesis.go`:

```go
// core/genesis.go
var GydsGenesis = &GenesisConfig{
    Validators: []string{
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003",
        "0xYOUR_VALIDATOR_ADDRESS_HERE",   // ← add this line
    },
    ...
}
```

### Step 3 — Fund your validator address

Your validator address needs a GYDS balance to participate. Transfer tokens from an existing wallet:

**MetaMask → Send → Paste your validator address**

Minimum recommended balance: **1,000,000 GYDS** (for full stake weight)

### Step 4 — Start your node

Once your address is in the validator set and you have a funded balance, start the node:

```bash
GYDS_VALIDATOR_KEY=yourprivatekeyhere ./bin/gyds-validatornode start
```

Watch for this log line — it means your node is active:
```
INF PoS engine started active=true blockTime=5s validator=0xYOUR_ADDRESS
```

And when you propose a block:
```
INF Block proposed and committed number=1234 hash=0xabc... txs=3
```

### Step 5 — Verify via RPC

```bash
# Check validator set
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"gyds_validatorSet","params":[],"id":1}' | jq .

# Check latest block height
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## Ports & Firewall

| Port | Protocol | Direction | Purpose |
|---|---|---|---|
| **30303** | TCP + UDP | Inbound + Outbound | P2P peer discovery and sync |
| **8545** | TCP | **Localhost only** | JSON-RPC (monitoring) |

> **Important:** Port 8545 must **never** be exposed publicly on a validator node. The setup script automatically blocks it in UFW.

```bash
# Allow only P2P
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp
sudo ufw deny  8545/tcp    # block RPC from internet
sudo ufw enable
```

---

## Node Monitoring

```bash
# Docker
docker compose logs -f
docker compose ps

# Systemd
journalctl -u gyds-validatornode -f
systemctl status gyds-validatornode

# Health check
curl -s http://127.0.0.1:8545/health
# {"mode":"validator","status":"ok","height":12345}

# Validator status
curl -s http://127.0.0.1:8545/api/validator
```

---

## Updating

```bash
# With the setup script
sudo bash /opt/gyds-validatornode/setup-validatornode-server.sh --update

# Manually
cd /opt/gyds-validatornode
git pull origin main
docker compose build --no-cache
docker compose up -d
```

---

## Security Best Practices

1. **Never expose port 8545 publicly** — the validator RPC is local-only by design
2. **Back up your private key / keystore file** in an encrypted, offline location
3. **Restrict file permissions** on your `.env`:
   ```bash
   chmod 600 .env
   ```
4. **Use a dedicated server** for your validator — don't run it alongside a public RPC node
5. **Keep the OS and Docker updated** regularly
6. **Monitor your node** — missed block proposals reduce your validator rewards
7. **Use a firewall** — only port 30303 should be publicly accessible

---

## Related Repos

| Repo | Description |
|---|---|
| [fullnode](https://github.com/hc172808/fullnode) | Full blockchain node with RPC |
| [litenode](https://github.com/hc172808/litenode) | Lightweight sync node |
| [boostnode](https://github.com/hc172808/boostnode) | High-throughput relay node |
| [rpcnode](https://github.com/hc172808/rpcnode) | Dedicated public RPC/WS endpoint |

---

**Chain ID:** 13370 · **Symbol:** GYDS · **Decimals:** 18 · **Block Time:** 5s
