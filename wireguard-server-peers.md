# GYDS Chain — WireGuard Server Peer Config Reference

After running `setup-wireguard.sh` on each node, each script prints the
`[Peer]` block you need to add to your **server's** `/etc/wireguard/wg0.conf`.

Add all four blocks to the server config, then reload with:

```bash
sudo wg syncconf wg0 <(wg-quick strip wg0)
# or full restart:
sudo systemctl restart wg-quick@wg0
```

---

## Default VPN IP assignments

| Node           | VPN IP       | Repo default |
|----------------|-------------|--------------|
| rpcnode        | 10.8.0.2/32 | `--client-vpn-ip 10.8.0.2/32` |
| validatornode  | 10.8.0.3/32 | `--client-vpn-ip 10.8.0.3/32` |
| fullnode       | 10.8.0.4/32 | `--client-vpn-ip 10.8.0.4/32` |
| litenode       | 10.8.0.5/32 | `--client-vpn-ip 10.8.0.5/32` |
| WireGuard server | 10.8.0.1 | (your server) |

---

## Server `/etc/wireguard/wg0.conf` template

```ini
[Interface]
PrivateKey = <SERVER_PRIVATE_KEY>
Address    = 10.8.0.1/24
ListenPort = 51820

# Enable forwarding so nodes can reach each other
PostUp   = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# ── GYDS rpcnode ─────────────────────────────────────────────
[Peer]
PublicKey  = <RPCNODE_PUBLIC_KEY>      # get with: sudo bash setup-wireguard.sh --show-pubkey
AllowedIPs = 10.8.0.2/32

# ── GYDS validatornode ───────────────────────────────────────
[Peer]
PublicKey  = <VALIDATORNODE_PUBLIC_KEY>
AllowedIPs = 10.8.0.3/32

# ── GYDS fullnode ────────────────────────────────────────────
[Peer]
PublicKey  = <FULLNODE_PUBLIC_KEY>
AllowedIPs = 10.8.0.4/32

# ── GYDS litenode ────────────────────────────────────────────
[Peer]
PublicKey  = <LITENODE_PUBLIC_KEY>
AllowedIPs = 10.8.0.5/32
```

---

## Server sysctl — enable IP forwarding (required)

```bash
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.d/99-wireguard.conf
sysctl -p /etc/sysctl.d/99-wireguard.conf
```

---

## Collecting public keys from all nodes

SSH into each node and run:

```bash
# rpcnode
sudo bash /opt/gyds-rpcnode/setup-wireguard.sh --show-pubkey

# validatornode
sudo bash /opt/gyds-validatornode/setup-wireguard.sh --show-pubkey

# fullnode
sudo bash /opt/gyds-fullnode/setup-wireguard.sh --show-pubkey

# litenode
sudo bash /opt/gyds-litenode/setup-wireguard.sh --show-pubkey
```

---

## Quick deployment — run on each node server

```bash
# rpcnode
sudo bash setup-wireguard.sh \
  --server-pubkey   "YOUR_SERVER_PUBLIC_KEY" \
  --server-endpoint "YOUR_SERVER_IP:51820" \
  --client-vpn-ip   "10.8.0.2/32"

# validatornode
sudo bash setup-wireguard.sh \
  --server-pubkey   "YOUR_SERVER_PUBLIC_KEY" \
  --server-endpoint "YOUR_SERVER_IP:51820" \
  --client-vpn-ip   "10.8.0.3/32"

# fullnode
sudo bash setup-wireguard.sh \
  --server-pubkey   "YOUR_SERVER_PUBLIC_KEY" \
  --server-endpoint "YOUR_SERVER_IP:51820" \
  --client-vpn-ip   "10.8.0.4/32"

# litenode
sudo bash setup-wireguard.sh \
  --server-pubkey   "YOUR_SERVER_PUBLIC_KEY" \
  --server-endpoint "YOUR_SERVER_IP:51820" \
  --client-vpn-ip   "10.8.0.5/32"
```

---

## Verify connectivity after setup

```bash
# From your WireGuard server, ping each node:
ping 10.8.0.2   # rpcnode
ping 10.8.0.3   # validatornode (RPC accessible at 10.8.0.3:8545)
ping 10.8.0.4   # fullnode
ping 10.8.0.5   # litenode

# From any node, check handshake:
sudo wg show
```

---

## Validator node special note

The validator's port `8545` is **blocked from the public internet** and only
accessible over the VPN tunnel. From your WireGuard server you can:

```bash
curl -X POST http://10.8.0.3:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

This means even if the validator server's IP is discovered, no one can reach
the RPC without first being authenticated as a WireGuard peer.
