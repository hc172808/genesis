package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"

	"github.com/gydschain/rpcnode/config"
	"github.com/gydschain/rpcnode/core"
	"github.com/gydschain/rpcnode/p2p"
	"github.com/gydschain/rpcnode/rpc"
)

var version = "1.0.0"

func main() {
	root := &cobra.Command{
		Use:   "gyds-rpcnode",
		Short: "GYDS Chain RPC Node",
		Long: `GYDS RPC Node — a high-availability JSON-RPC and WebSocket endpoint
for the GYDS Chain. Syncs chain state via P2P, serves wallet and dApp requests.
Does not produce blocks.`,
	}

	root.AddCommand(startCmd(), versionCmd())
	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}

func startCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "start",
		Short: "Start the GYDS RPC node",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runNode()
		},
	}
}

func versionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("gyds-rpcnode v%s\n", version)
		},
	}
}

func runNode() error {
	cfg := config.FromEnv()

	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if cfg.LogFormat == "pretty" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})
	}
	level, err := zerolog.ParseLevel(cfg.LogLevel)
	if err != nil {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)

	log.Info().
		Str("version", version).
		Str("mode", cfg.NodeMode).
		Int64("chainId", cfg.ChainID).
		Int("rpcPort", cfg.RPCPort).
		Int("wsPort", cfg.WSPort).
		Msg("Starting GYDS RPC node")

	chain := core.NewChain(core.GydsGenesis, cfg.DataDir)
	log.Info().Uint64("height", chain.Height()).Msg("Chain initialised from genesis")

	rpcSrv := rpc.NewServer(chain, cfg.RPCPort, cfg.WSPort, cfg.RPCHost, cfg.CORSOrigins)

	p2pSrv := p2p.NewServer(cfg.P2PPort, cfg.ChainID, chain.Height)
	p2pSrv.OnMessage(func(peer *p2p.Peer, msg p2p.Message) {
		if msg.Type == p2p.MsgNewBlock {
			rpcSrv.BroadcastWS(map[string]interface{}{
				"type": "newBlock",
				"data": msg,
			})
		}
	})

	for _, addr := range cfg.P2PBootstrap {
		if err := p2pSrv.ConnectTo(addr); err != nil {
			log.Warn().Err(err).Str("addr", addr).Msg("Failed to connect to bootstrap peer")
		}
	}
	if err := p2pSrv.Start(); err != nil {
		log.Warn().Err(err).Msg("P2P server failed to start (continuing without P2P)")
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- rpcSrv.Start()
	}()

	log.Info().
		Int("rpcPort", cfg.RPCPort).
		Int("wsPort", cfg.WSPort).
		Msg("RPC node ready — serving JSON-RPC and WebSocket requests")

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	select {
	case s := <-sig:
		log.Info().Str("signal", s.String()).Msg("Shutting down RPC node")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		rpcSrv.Shutdown(ctx)
		chain.Close()
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("RPC server: %w", err)
		}
	}
	return nil
}
