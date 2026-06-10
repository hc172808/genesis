# GYDS Chain — Complete Setup Guide

> **Network at a glance**
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

---

## Step 1 — Run Genesis Init (once, on first machine)

```bash
bash genesis-init.sh \
  --chain-id 13370 \
  --validators 3 \
  --rpc-url http://YOUR_RPC_NODE_IP:8545 \
  --ws-url  ws://YOUR_RPC_NODE_IP:8546
```

This creates `data/genesis/` containing:
- `genesis.json` — the genesis block (share with every node operator)
- `wallet-config.json` — copy-paste values for MetaMask / Trust Wallet
- `network.env` — environment variables to source before running nodes

---

## Step 2 — Add GYDS Chain to MetaMask

### On Desktop (Browser Extension)

1. Open MetaMask and click the **network dropdown** at the top (e.g. "Ethereum Mainnet")
2. Click **Add network** → **Add a network manually**
3. Fill in exactly:

   | Field | Value |
   |---|---|
   | Network Name | GYDS Chain |
   | New RPC URL | `http://YOUR_RPC_NODE_IP:8545` |
   | Chain ID | `13370` |
   | Currency Symbol | `GYDS` |
   | Block Explorer URL | *(leave blank for now, or add your explorer URL later)* |

4. Click **Save**
5. MetaMask will switch to GYDS Chain automatically

### On Mobile (MetaMask App)

1. Tap the **hamburger menu** (☰) → **Settings** → **Networks**
2. Tap **Add Network**
3. Enter the same values as above
4. Tap **Add**

### Verify it works
- Your balance should show `0 GYDS`
- The network badge at the top should say **GYDS Chain**
- Send a test transaction to yourself — if the tx goes through, the RPC is working

---

## Step 3 — Add GYDS Chain to Trust Wallet

### On Mobile

1. Open Trust Wallet → tap **Settings** (bottom right)
2. Tap **Networks** → **Add Custom Network**
3. Fill in:

   | Field | Value |
   |---|---|
   | Name | GYDS Chain |
   | Short Name | GYDS |
   | RPC URL | `http://YOUR_RPC_NODE_IP:8545` |
   | Chain ID | `13370` |
   | Symbol | `GYDS` |
   | Decimals | `18` |
   | Explorer | *(optional — add later)* |

4. Tap **Done** / **Save**

> **Note:** Trust Wallet requires the RPC URL to be publicly reachable (not `localhost`). Your RPC node must have port `8545` open and accessible from the internet or your phone's network.

---

## Step 4 — Node Setup

After distributing `genesis.json` to each machine, every operator runs:

```bash
# Always source network vars first
source data/genesis/network.env
```

Then pick the node type below.

---

### Lite Node
Syncs block headers only — lightweight, fast to start. Good for wallets and light verification.

```bash
# Clone and run
git clone https://github.com/hc172808/litenode
cd litenode
sudo bash setup-litenode-server.sh \
  --datadir /data/gyds-genesis \
  --genesis /path/to/genesis.json \
  --chain-id 13370
```

**Ports used:** P2P `30303`
**Does NOT expose RPC** — not suitable as a wallet endpoint on its own.

---

### Full Node
Downloads and verifies the entire chain. Required for indexers, explorers, and archival.

```bash
git clone https://github.com/hc172808/fullnode
cd fullnode
sudo bash setup-fullnode-server.sh \
  --datadir /data/gyds-genesis \
  --genesis /path/to/genesis.json \
  --chain-id 13370
```

**Ports used:** P2P `30303`
**Tip:** Let this fully sync before starting an RPC node pointed at it.

---

### RPC Node
Exposes the JSON-RPC and WebSocket API that wallets (MetaMask, Trust Wallet) connect to.

```bash
git clone https://github.com/hc172808/rpcnode
cd rpcnode
sudo bash setup-rpcnode-server.sh \
  --datadir /data/gyds-genesis \
  --genesis /path/to/genesis.json \
  --chain-id 13370 \
  --rpc-port 8545 \
  --ws-port  8546
```

**Ports to open on your firewall:**
```bash
sudo ufw allow 8545/tcp   # HTTP RPC
sudo ufw allow 8546/tcp   # WebSocket
sudo ufw allow 30303/tcp  # P2P
sudo ufw allow 30303/udp  # P2P discovery
```

**This is the URL you put in MetaMask and Trust Wallet.**

---

### Validator Node
Produces and signs blocks. Requires a funded keystore address.

```bash
git clone https://github.com/hc172808/validatornode  # update URL if different
cd validatornode
sudo bash setup-validatornode-server.sh \
  --datadir    /data/gyds-genesis \
  --genesis    /path/to/genesis.json \
  --chain-id   13370 \
  --keystore   /data/gyds-genesis/keystore/YOUR_KEY.json \
  --unlock     0xYOUR_VALIDATOR_ADDRESS \
  --password   /path/to/password.txt
```

**Ports to open:**
```bash
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp
```

> **Security:** Never expose validator RPC to the public internet. Keep port 8545 firewalled on validator machines.

---

### Boost Node
Accelerates peer discovery and block propagation — acts as a relay/seed node.

```bash
git clone https://github.com/hc172808/boostnode
cd boostnode
sudo bash setup-boostnode-server.sh \
  --datadir  /data/gyds-genesis \
  --genesis  /path/to/genesis.json \
  --chain-id 13370
```

**Ports to open:**
```bash
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp
```

---

## Step 5 — Verify the Network is Live

Once your RPC node is running, run these quick checks from any machine:

```bash
RPC="http://YOUR_RPC_NODE_IP:8545"

# Check chain ID (should return 0x343a)
curl -s -X POST $RPC \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Check latest block number
curl -s -X POST $RPC \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check peer count (should be > 0 when other nodes are connected)
curl -s -X POST $RPC \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
```

Expected responses:
- `eth_chainId` → `"result": "0x343a"`
- `eth_blockNumber` → `"result": "0x0"` (block 0 at start, increments as validators produce blocks)
- `net_peerCount` → `"result": "0x2"` or higher

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| MetaMask shows "Could not fetch chain ID" | RPC not reachable | Check firewall, ensure port 8545 is open and node is running |
| MetaMask shows wrong network | Chain ID mismatch | Double-check you entered `13370`, not `1337` or other |
| Trust Wallet can't connect | HTTP vs HTTPS | Some builds require `https://` — put an nginx TLS proxy in front of port 8545 |
| No peers connecting | P2P port blocked | Open port 30303 TCP+UDP on all nodes |
| Validator not producing blocks | Key not unlocked or not in genesis validators list | Confirm address is in genesis.json `validators` array |
| Balance shows 0 after genesis | Wallet address not in alloc | Re-run genesis init with your address in the alloc section |

---

## Firewall Quick Reference

```bash
# RPC node (public-facing)
sudo ufw allow 8545/tcp    # MetaMask / Trust Wallet connect here
sudo ufw allow 8546/tcp    # WebSocket
sudo ufw allow 30303/tcp   # P2P
sudo ufw allow 30303/udp

# Validator / Full / Lite / Boost nodes (no public RPC)
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp
sudo ufw deny  8545/tcp    # keep RPC private on non-RPC nodes
```

---

## Share GitHub Repos

Send your GitHub links for `litenode`, `fullnode`, `rpcnode`, `validatornode`, and `boostnode` and the node-specific sections above will be updated with the exact flags and config your scripts expect.
