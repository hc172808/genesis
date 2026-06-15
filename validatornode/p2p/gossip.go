package p2p

import (
	"encoding/json"
	"fmt"
	"net"
	"time"

	"github.com/rs/zerolog/log"
)

// ── GossipNetwork wraps the P2P Server with typed broadcast helpers ──────────

type GossipNetwork struct {
	server       *Server
	bootstrapPeers []string
}

func NewGossipNetwork(server *Server, bootstrapPeers []string) *GossipNetwork {
	return &GossipNetwork{server: server, bootstrapPeers: bootstrapPeers}
}

// Start connects to all bootstrap peers then starts the P2P server.
func (g *GossipNetwork) Start() error {
	if err := g.server.Start(); err != nil {
		return err
	}
	g.connectBootstrapPeers()
	return nil
}

func (g *GossipNetwork) connectBootstrapPeers() {
	for _, addr := range g.bootstrapPeers {
		go func(a string) {
			// retry with backoff in case the bootstrap peer is not up yet
			backoff := 2 * time.Second
			for attempt := 0; attempt < 5; attempt++ {
				if err := g.server.ConnectTo(a); err != nil {
					log.Warn().Str("peer", a).Int("attempt", attempt+1).
						Err(err).Msg("bootstrap connect failed, retrying")
					time.Sleep(backoff)
					backoff *= 2
					continue
				}
				log.Info().Str("peer", a).Msg("connected to bootstrap peer")
				return
			}
			log.Error().Str("peer", a).Msg("failed to connect to bootstrap peer after retries")
		}(addr)
	}
}

// ── Block gossip ──────────────────────────────────────────────────────────────

type GossipBlock struct {
	Number    uint64 `json:"number"`
	Hash      string `json:"hash"`
	ParentHash string `json:"parentHash"`
	Validator string `json:"validator"`
	Timestamp int64  `json:"timestamp"`
	TxCount   int    `json:"txCount"`
}

// BroadcastBlock propagates a new block to all connected peers.
func (g *GossipNetwork) BroadcastBlock(b GossipBlock) {
	payload, err := json.Marshal(b)
	if err != nil {
		log.Error().Err(err).Msg("gossip: failed to marshal block")
		return
	}
	count := g.server.PeerCount()
	if count == 0 {
		log.Debug().Uint64("block", b.Number).Msg("gossip: no peers to broadcast block to")
		return
	}
	g.server.Broadcast(Message{Type: MsgNewBlock, Payload: payload})
	log.Info().Uint64("block", b.Number).Str("hash", shortHash(b.Hash)).
		Int("peers", count).Msg("gossip: block broadcast")
}

// ── Transaction gossip ────────────────────────────────────────────────────────

type GossipTx struct {
	Hash      string `json:"hash"`
	From      string `json:"from"`
	To        string `json:"to"`
	ValueHex  string `json:"value"`
	GasLimit  uint64 `json:"gasLimit"`
	GasPrice  string `json:"gasPrice"`
	Nonce     uint64 `json:"nonce"`
	Data      string `json:"data,omitempty"`
	Timestamp int64  `json:"timestamp"`
}

// BroadcastTx propagates a new pending transaction to all connected peers.
func (g *GossipNetwork) BroadcastTx(tx GossipTx) {
	payload, err := json.Marshal(tx)
	if err != nil {
		log.Error().Err(err).Msg("gossip: failed to marshal tx")
		return
	}
	count := g.server.PeerCount()
	if count == 0 {
		log.Debug().Str("tx", shortHash(tx.Hash)).Msg("gossip: no peers for tx broadcast")
		return
	}
	g.server.Broadcast(Message{Type: MsgNewTx, Payload: payload})
	log.Debug().Str("tx", shortHash(tx.Hash)).Int("peers", count).Msg("gossip: tx broadcast")
}

// ── Peer discovery ────────────────────────────────────────────────────────────

// DiscoverAndConnect probes a list of addresses and connects to any that are up.
// Useful for dynamic peer lists (from a bootstrap DNS or config file).
func (g *GossipNetwork) DiscoverAndConnect(addrs []string) {
	for _, addr := range addrs {
		go func(a string) {
			conn, err := net.DialTimeout("tcp", a, 5*time.Second)
			if err != nil {
				log.Debug().Str("addr", a).Msg("peer discovery: not reachable")
				return
			}
			conn.Close() // probe succeeded, now let Server handle it
			if err := g.server.ConnectTo(a); err != nil {
				log.Debug().Str("addr", a).Err(err).Msg("peer discovery: connect failed")
			}
		}(addr)
	}
}

// PeerCount returns the number of currently connected peers.
func (g *GossipNetwork) PeerCount() int {
	return g.server.PeerCount()
}

// ── Node discovery heartbeat ──────────────────────────────────────────────────

// StartDiscoveryLoop periodically probes new candidates from a dynamic provider.
// peerProvider is called every interval; it should return candidate peer addresses.
func (g *GossipNetwork) StartDiscoveryLoop(interval time.Duration, peerProvider func() []string) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			candidates := peerProvider()
			if len(candidates) == 0 {
				continue
			}
			log.Debug().Int("candidates", len(candidates)).Msg("gossip: peer discovery probe")
			g.DiscoverAndConnect(candidates)
		}
	}()
}

// ── Checkpoint sync helper ────────────────────────────────────────────────────

type CheckpointRequest struct {
	FromBlock uint64 `json:"fromBlock"`
	Limit     int    `json:"limit"`
}

// RequestCheckpointSync asks a specific peer to send blocks from a checkpoint.
// The caller's onMsg handler (set via Server.OnMessage) will receive MsgBlocks responses.
func (g *GossipNetwork) RequestCheckpointSync(peerAddr string, fromBlock uint64, limit int) error {
	// Find the peer by address
	g.server.mu.RLock()
	peer, ok := g.server.peers[peerAddr]
	g.server.mu.RUnlock()
	if !ok {
		return fmt.Errorf("peer %s not connected", peerAddr)
	}
	payload, _ := json.Marshal(CheckpointRequest{FromBlock: fromBlock, Limit: limit})
	peer.Send(Message{Type: MsgGetBlocks, Payload: payload})
	log.Info().Str("peer", peerAddr).Uint64("fromBlock", fromBlock).Msg("gossip: requested checkpoint sync")
	return nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func shortHash(h string) string {
	if len(h) <= 14 {
		return h
	}
	return h[:10] + "…" + h[len(h)-6:]
}
