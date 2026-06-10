#!/usr/bin/env bash
# ============================================================
# GYDS Chain — Genesis Block Initialisation
# Creates genesis.json, initialises chain state.
# Usage: bash genesis-init.sh [--datadir /data/gyds] [--validators N] [--rpc-url http://1.2.3.4:8545]
# ============================================================
set -euo pipefail

GYDS_CHAIN_ID="${GYDS_CHAIN_ID:-13370}"
GYDS_NETWORK_NAME="${GYDS_NETWORK_NAME:-GYDS Chain}"
GYDS_DATADIR="${GYDS_DATADIR:-./data/genesis}"
NUM_VALIDATORS="${NUM_VALIDATORS:-3}"
GENESIS_SUPPLY="${GENESIS_SUPPLY:-1000000000}"
GYDS_TOKEN_SYMBOL="${GYDS_TOKEN_SYMBOL:-GYDS}"
GYDS_RPC_URL="${GYDS_RPC_URL:-http://YOUR_RPC_NODE_IP:8545}"
GYDS_WS_URL="${GYDS_WS_URL:-ws://YOUR_RPC_NODE_IP:8546}"
GYDS_EXPLORER_URL="${GYDS_EXPLORER_URL:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --datadir)      GYDS_DATADIR="$2";      shift 2 ;;
    --chain-id)     GYDS_CHAIN_ID="$2";     shift 2 ;;
    --validators)   NUM_VALIDATORS="$2";    shift 2 ;;
    --supply)       GENESIS_SUPPLY="$2";    shift 2 ;;
    --rpc-url)      GYDS_RPC_URL="$2";      shift 2 ;;
    --ws-url)       GYDS_WS_URL="$2";       shift 2 ;;
    --explorer-url) GYDS_EXPLORER_URL="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[GENESIS]${NC} $*"; }
info() { echo -e "${CYAN}  →${NC} $*"; }

TIMESTAMP=$(date -u +%s)
TIMESTAMP_HEX=$(printf '0x%x' "$TIMESTAMP")

log "Initialising GYDS genesis block..."
log "Chain ID    : ${GYDS_CHAIN_ID}"
log "Network     : ${GYDS_NETWORK_NAME}"
log "Validators  : ${NUM_VALIDATORS}"
log "Total Supply: ${GENESIS_SUPPLY} ${GYDS_TOKEN_SYMBOL}"
log "Data Dir    : ${GYDS_DATADIR}"

mkdir -p "${GYDS_DATADIR}"/{keystore,chaindata}

# Calculate supply in wei — try python3 first, then node, then approximate
if command -v python3 &>/dev/null; then
  SUPPLY_WEI=$(python3 -c "print(${GENESIS_SUPPLY} * 10**18)")
elif command -v node &>/dev/null; then
  SUPPLY_WEI=$(node -e "console.log((BigInt(${GENESIS_SUPPLY}) * BigInt(10)**BigInt(18)).toString())")
else
  SUPPLY_WEI="${GENESIS_SUPPLY}000000000000000000"
fi

# Build validators array and alloc entries
declare -a VALIDATORS
VALIDATOR_ALLOC=""
for i in $(seq 1 "${NUM_VALIDATORS}"); do
  ADDR=$(printf "0x%040d" "$i")
  VALIDATORS+=("$ADDR")
  if command -v python3 &>/dev/null; then
    ALLOC_SHARE=$(python3 -c "print(int(${GENESIS_SUPPLY}/${NUM_VALIDATORS} * 10**18))")
  else
    ALLOC_SHARE="333333333333333333333333333"
  fi
  VALIDATOR_ALLOC="${VALIDATOR_ALLOC}    \"${ADDR}\": { \"balance\": \"${ALLOC_SHARE}\", \"nonce\": 0 }"
  [[ $i -lt $NUM_VALIDATORS ]] && VALIDATOR_ALLOC="${VALIDATOR_ALLOC},"
  VALIDATOR_ALLOC="${VALIDATOR_ALLOC}"$'\n'
  info "Validator $i: ${ADDR}"
done

VALIDATORS_JSON=$(printf '"%s"' "${VALIDATORS[0]}")
for v in "${VALIDATORS[@]:1}"; do
  VALIDATORS_JSON="${VALIDATORS_JSON}, \"${v}\""
done

# Hex-encode the network name for extraData (works without xxd)
hex_encode() {
  local input="$1"
  local hex=""
  for ((i=0; i<${#input}; i++)); do
    hex+=$(printf '%02x' "'${input:$i:1}")
  done
  echo "0x${hex}"
}
EXTRA_DATA="$(hex_encode "${GYDS_NETWORK_NAME}")"

cat > "${GYDS_DATADIR}/genesis.json" <<GENESIS
{
  "chainId": ${GYDS_CHAIN_ID},
  "networkName": "${GYDS_NETWORK_NAME}",
  "token": {
    "symbol": "${GYDS_TOKEN_SYMBOL}",
    "name": "GYDS Token",
    "decimals": 18,
    "totalSupply": "${GENESIS_SUPPLY}"
  },
  "timestamp": "${TIMESTAMP_HEX}",
  "timestampUnix": ${TIMESTAMP},
  "gasLimit": "0x1C9C380",
  "gasPrice": "0x3B9ACA00",
  "difficulty": "0x1",
  "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "extraData": "${EXTRA_DATA}",
  "consensus": "pos",
  "validators": [${VALIDATORS_JSON}],
  "validatorStakeMin": "1000000000000000000000",
  "epochLength": 100,
  "blockTime": 5,
  "alloc": {
${VALIDATOR_ALLOC}  }
}
GENESIS

log "Genesis block file written: ${GYDS_DATADIR}/genesis.json"

cat > "${GYDS_DATADIR}/network.env" <<ENV
GYDS_CHAIN_ID=${GYDS_CHAIN_ID}
GYDS_NETWORK_NAME=${GYDS_NETWORK_NAME}
GYDS_TOKEN_SYMBOL=${GYDS_TOKEN_SYMBOL}
GYDS_GENESIS_TIMESTAMP=${TIMESTAMP}
GYDS_VALIDATOR_COUNT=${NUM_VALIDATORS}
GYDS_RPC_URL=${GYDS_RPC_URL}
GYDS_WS_URL=${GYDS_WS_URL}
GYDS_EXPLORER_URL=${GYDS_EXPLORER_URL}
ENV

log "Network environment file written: ${GYDS_DATADIR}/network.env"

# Build wallet-config.json for MetaMask / Trust Wallet import
CHAIN_ID_HEX=$(printf '0x%x' "${GYDS_CHAIN_ID}")
EXPLORER_BLOCK=""
[[ -n "${GYDS_EXPLORER_URL}" ]] && EXPLORER_BLOCK=",
    \"blockExplorerUrls\": [\"${GYDS_EXPLORER_URL}\"]"

cat > "${GYDS_DATADIR}/wallet-config.json" <<WALLET
{
  "chainId": "${CHAIN_ID_HEX}",
  "chainName": "${GYDS_NETWORK_NAME}",
  "nativeCurrency": {
    "name": "${GYDS_NETWORK_NAME} Token",
    "symbol": "${GYDS_TOKEN_SYMBOL}",
    "decimals": 18
  },
  "rpcUrls": ["${GYDS_RPC_URL}"],
  "wsUrls": ["${GYDS_WS_URL}"]${EXPLORER_BLOCK}
}
WALLET

log "Wallet config written: ${GYDS_DATADIR}/wallet-config.json"

cat > "${GYDS_DATADIR}/README.md" <<README
# GYDS Chain Genesis

- Chain ID: ${GYDS_CHAIN_ID} (0x$(printf '%x' ${GYDS_CHAIN_ID}))
- Network: ${GYDS_NETWORK_NAME}
- Token: ${GYDS_TOKEN_SYMBOL} (18 decimals)
- RPC URL: ${GYDS_RPC_URL}
- Created: $(date -u)
- Validators: ${NUM_VALIDATORS}
- Supply: ${GENESIS_SUPPLY} ${GYDS_TOKEN_SYMBOL}

## Files
- \`genesis.json\`      — genesis block (distribute to all node operators)
- \`wallet-config.json\` — copy these values into MetaMask / Trust Wallet
- \`network.env\`       — source this before running any node script
- \`keystore/\`         — place validator key files here
- \`chaindata/\`        — blockchain state (populated on first node run)

## Add GYDS Chain to MetaMask
1. Open MetaMask → Settings → Networks → Add Network → Add manually
2. Fill in the values from \`wallet-config.json\`:
   - Network Name: ${GYDS_NETWORK_NAME}
   - RPC URL: ${GYDS_RPC_URL}
   - Chain ID: ${GYDS_CHAIN_ID}
   - Currency Symbol: ${GYDS_TOKEN_SYMBOL}
   - Decimals: 18

## Add GYDS Chain to Trust Wallet
1. Open Trust Wallet → Settings → Networks → Add Custom Network
2. Use the same values as above

## Bootstrap a node with this genesis
\`\`\`bash
source network.env

# Lite node
sudo bash setup-litenode-server.sh --datadir ${GYDS_DATADIR}

# Full node
sudo bash setup-fullnode-server.sh --datadir ${GYDS_DATADIR}

# RPC node
sudo bash setup-rpcnode-server.sh --datadir ${GYDS_DATADIR}

# Validator node
sudo bash setup-validatornode-server.sh --datadir ${GYDS_DATADIR}
\`\`\`
README

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  GYDS Chain — Genesis Block Initialised!         ${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
echo "  Genesis file  : ${GYDS_DATADIR}/genesis.json"
echo "  Wallet config : ${GYDS_DATADIR}/wallet-config.json"
echo "  Network env   : ${GYDS_DATADIR}/network.env"
echo ""
echo "  Chain ID      : ${GYDS_CHAIN_ID} (0x$(printf '%x' ${GYDS_CHAIN_ID}))"
echo "  Symbol        : ${GYDS_TOKEN_SYMBOL} (18 decimals)"
echo "  RPC URL       : ${GYDS_RPC_URL}"
echo "  Validators    : ${NUM_VALIDATORS}"
echo "  Supply        : ${GENESIS_SUPPLY} ${GYDS_TOKEN_SYMBOL}"
echo ""
echo "  Next steps:"
echo "    1. Replace RPC/WS URLs in wallet-config.json with your real node IP"
echo "    2. Distribute genesis.json to all node operators"
echo "    3. Source network.env before running node scripts"
echo "    4. See SETUP_GUIDE.md for MetaMask, Trust Wallet & node instructions"
