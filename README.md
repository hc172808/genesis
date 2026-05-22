# GYDS Genesis Init

One-command genesis block initialisation for the GYDS Chain.

## Usage

```bash
# Default (chain ID 13370, 3 validators, 1B supply)
bash genesis-init.sh

# Custom
bash genesis-init.sh \
  --chain-id 13370 \
  --validators 5 \
  --supply 500000000 \
  --datadir /data/gyds-genesis
```

## What it creates

```
data/genesis/
├── genesis.json     ← genesis block (distribute to all node operators)
├── network.env      ← env vars to source before running node scripts
├── keystore/        ← add your validator key files here
├── chaindata/       ← populated on first node run
└── README.md
```

## Bootstrap a node with this genesis

```bash
# 1. Run genesis init (once, on first machine)
bash genesis-init.sh --chain-id 13370 --validators 3

# 2. Distribute genesis.json to all operators
# 3. Source network vars and deploy a node
source data/genesis/network.env
sudo bash setup-litenode-server.sh    # https://github.com/hc172808/litenode
sudo bash setup-fullnode-server.sh    # https://github.com/hc172808/fullnode
sudo bash setup-rpcnode-server.sh     # https://github.com/hc172808/rpcnode
sudo bash setup-boostnode-server.sh   # https://github.com/hc172808/boostnode
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GYDS_CHAIN_ID` | `13370` | Numeric chain ID |
| `GYDS_NETWORK_NAME` | `GYDS Chain` | Human-readable network name |
| `GYDS_TOKEN_SYMBOL` | `GYDS` | Native token symbol |
| `NUM_VALIDATORS` | `3` | Number of initial validators |
| `GENESIS_SUPPLY` | `1000000000` | Total token supply |
| `GYDS_DATADIR` | `./data/genesis` | Output directory |
