package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	ChainID     int64
	NetworkName string
	NodeMode    string

	P2PPort      int
	P2PBootstrap []string
	MaxPeers     int

	RPCPort    int
	RPCHost    string
	RPCEnabled bool

	DataDir   string
	LogLevel  string
	LogFormat string

	ValidatorKey      string
	ValidatorAddress  string
	KeystorePath      string
	KeystorePassword  string
	MinStake          int64
}

func DefaultConfig() *Config {
	return &Config{
		ChainID:      13370,
		NetworkName:  "GYDS Chain",
		NodeMode:     "validator",
		P2PPort:      30303,
		P2PBootstrap: []string{},
		MaxPeers:     25,
		RPCPort:      8545,
		RPCHost:      "127.0.0.1",
		RPCEnabled:   true,
		DataDir:      "./data",
		LogLevel:     "info",
		LogFormat:    "pretty",
		MinStake:     1_000_000_000_000_000_000_000,
	}
}

func FromEnv() *Config {
	cfg := DefaultConfig()

	if v := os.Getenv("GYDS_CHAIN_ID"); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil {
			cfg.ChainID = id
		}
	}
	if v := os.Getenv("GYDS_NODE_MODE"); v != "" {
		cfg.NodeMode = v
	}
	if v := os.Getenv("GYDS_P2P_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.P2PPort = p
		}
	}
	if v := os.Getenv("GYDS_RPC_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.RPCPort = p
		}
	}
	if v := os.Getenv("GYDS_RPC_HOST"); v != "" {
		cfg.RPCHost = v
	}
	if v := os.Getenv("GYDS_DATA_DIR"); v != "" {
		cfg.DataDir = v
	}
	if v := os.Getenv("GYDS_LOG_LEVEL"); v != "" {
		cfg.LogLevel = v
	}
	if v := os.Getenv("GYDS_BOOTSTRAP_NODES"); v != "" {
		cfg.P2PBootstrap = strings.Split(v, ",")
	}
	if v := os.Getenv("GYDS_VALIDATOR_KEY"); v != "" {
		cfg.ValidatorKey = v
	}
	if v := os.Getenv("GYDS_VALIDATOR_ADDRESS"); v != "" {
		cfg.ValidatorAddress = v
	}
	if v := os.Getenv("GYDS_KEYSTORE_PATH"); v != "" {
		cfg.KeystorePath = v
	}
	if v := os.Getenv("GYDS_KEYSTORE_PASSWORD"); v != "" {
		cfg.KeystorePassword = v
	}
	return cfg
}
