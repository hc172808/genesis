package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"

	"github.com/gydschain/validatornode/config"
	"github.com/gydschain/validatornode/consensus"
	"github.com/gydschain/validatornode/core"
	"github.com/gydschain/validatornode/p2p"
	"github.com/gydschain/validatornode/rpc"
	"github.com/gydschain/validatornode/validator"
)

var version = "1.0.0"

func main() {
	root := &cobra.Command{
		Use:   "gyds-validatornode",
		Short: "GYDS Chain Validator Node",
		Long: `GYDS Validator Node — participates in PoS consensus, proposes and
signs blocks when selected as the current epoch proposer.`,
	}

	root.AddCommand(startCmd(), genesisCmd(), versionCmd(), keygenCmd())
	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}

func startCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "start",
		Short: "Start the GYDS validator node",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runNode()
		},
	}
}

func genesisCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "genesis",
		Short: "Print genesis block",
		Run: func(cmd *cobra.Command, args []string) {
			b := core.GenesisBlock(core.GydsGenesis)
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			enc.Encode(b.ToMap())
		},
	}
}

func versionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("gyds-validatornode v%s\n", version)
		},
	}
}

func keygenCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "keygen",
		Short: "Generate a new validator key and print the address",
		RunE: func(cmd *cobra.Command, args []string) error {
			signer, err := validator.GenerateKey()
			if err != nil {
				return fmt.Errorf("keygen failed: %w", err)
			}
			fmt.Printf("Validator address : %s\n", signer.Address())
			fmt.Printf("Private key (hex) : %s\n", signer.PrivateKeyHex())
			fmt.Println("")
			fmt.Println("Store the private key safely.")
			fmt.Println("Set GYDS_VALIDATOR_KEY=<hex> in your .env before starting.")
			return nil
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

	if cfg.ValidatorKey == "" && cfg.KeystorePath == "" {
		return fmt.Errorf(
			"no validator key configured.\n" +
				"  Option 1: set GYDS_VALIDATOR_KEY=<hex-private-key> in .env\n" +
				"  Option 2: set GYDS_KEYSTORE_PATH and GYDS_KEYSTORE_PASSWORD\n" +
				"  Run 'gyds-validatornode keygen' to generate a new key.",
		)
	}

	var signer *validator.Signer
	if cfg.ValidatorKey != "" {
		signer, err = validator.NewSignerFromHex(cfg.ValidatorKey)
	} else {
		signer, err = validator.NewSignerFromKeystore(cfg.KeystorePath, cfg.KeystorePassword)
	}
	if err != nil {
		return fmt.Errorf("loading validator key: %w", err)
	}

	log.Info().
		Str("version", version).
		Str("mode", cfg.NodeMode).
		Int64("chainId", cfg.ChainID).
		Str("validator", signer.Address()).
		Msg("Starting GYDS validator node")

	chain := core.NewChain(core.GydsGenesis, cfg.DataDir)
	log.Info().Uint64("height", chain.Height()).Msg("Chain initialised from genesis")

	vs := consensus.NewValidatorSet(core.GydsGenesis.Validators)

	isRegistered := vs.Contains(signer.Address())
	if !isRegistered {
		log.Warn().
			Str("address", signer.Address()).
			Msg("Validator address is NOT in the genesis validator set — will observe but not propose blocks. " +
				"Add your address to genesis.json validators to participate in consensus.")
	} else {
		log.Info().Str("address", signer.Address()).Msg("Validator registered in genesis set — will propose blocks when selected")
	}

	engine := consensus.NewPoSEngine(chain, vs, signer, 5*time.Second)

	rpcSrv := rpc.NewServer(chain, vs, cfg.RPCPort, cfg.RPCHost)
	engine.OnNewBlock(func(b *core.Block) {
		log.Info().
			Uint64("number", b.Header.Number).
			Str("hash", b.Hash[:16]+"...").
			Int("txs", len(b.Transactions)).
			Str("validator", b.Header.Validator).
			Bool("proposed_by_us", b.Header.Validator == signer.Address()).
			Msg("New block")
		rpcSrv.NotifyNewBlock(b)
	})

	p2pSrv := p2p.NewServer(cfg.P2PPort, cfg.ChainID, chain.Height)
	for _, addr := range cfg.P2PBootstrap {
		if err := p2pSrv.ConnectTo(addr); err != nil {
			log.Warn().Err(err).Str("addr", addr).Msg("Failed to connect to bootstrap peer")
		}
	}
	if err := p2pSrv.Start(); err != nil {
		log.Warn().Err(err).Msg("P2P server failed to start (continuing without P2P)")
	}

	engine.Start()
	log.Info().
		Dur("blockTime", 5*time.Second).
		Bool("active", isRegistered).
		Msg("PoS engine started")

	errCh := make(chan error, 1)
	go func() {
		errCh <- rpcSrv.Start()
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	select {
	case s := <-sig:
		log.Info().Str("signal", s.String()).Msg("Shutting down validator node")
		engine.Stop()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
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
