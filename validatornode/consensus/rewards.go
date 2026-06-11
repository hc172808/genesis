package consensus

import (
	"math/big"
	"strings"

	"github.com/rs/zerolog/log"

	"github.com/gydschain/validatornode/core"
)

// ── Block Reward Constants ─────────────────────────────────────────────────────

var (
	// BlockReward is the amount of GYDS (in wei) minted to the validator per block.
	// Default: 2 GYDS = 2 * 10^18 wei
	BlockReward = new(big.Int).Mul(big.NewInt(2), new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil))

	// UncleReward is the reward for referenced uncle blocks (not used in pure PoS, set to 0)
	UncleReward = big.NewInt(0)
)

// RewardConfig holds reward parameters that can be adjusted via governance later.
type RewardConfig struct {
	// BlockReward per block in wei (default: 2 GYDS)
	BlockReward *big.Int
	// HalvingInterval is the block interval at which BlockReward is halved (0 = never)
	HalvingInterval uint64
	// BurnPercent is the percentage of tx fees to burn (0-100)
	BurnPercent int
}

var DefaultRewardConfig = &RewardConfig{
	BlockReward:     new(big.Int).Set(BlockReward),
	HalvingInterval: 0, // no halving yet
	BurnPercent:     0, // no burn yet
}

// ── ApplyBlockReward ───────────────────────────────────────────────────────────

// ApplyBlockReward mints GYDS to the block proposer and applies any tx fee logic.
// It is called by the consensus engine immediately after a new block is committed.
func ApplyBlockReward(chain *core.Chain, block *core.Block, cfg *RewardConfig) {
	if cfg == nil {
		cfg = DefaultRewardConfig
	}

	reward := effectiveReward(cfg, block.Header.Number)
	validator := strings.ToLower(block.Header.Validator)

	if validator == "" || validator == "0x0000000000000000000000000000000000000000" {
		log.Warn().Uint64("block", block.Header.Number).Msg("rewards: skipping — no validator address")
		return
	}

	// Mint block reward to the proposer
	chain.MintBalance(validator, reward)

	// Apply tx fee rewards from block transactions
	var totalFees big.Int
	for _, tx := range block.Transactions {
		if tx.GasPrice != nil && tx.GasUsed > 0 {
			fee := new(big.Int).Mul(tx.GasPrice, big.NewInt(int64(tx.GasUsed)))
			totalFees.Add(&totalFees, fee)
		}
	}

	if totalFees.Sign() > 0 {
		// Burn a percentage (if configured)
		if cfg.BurnPercent > 0 && cfg.BurnPercent <= 100 {
			burn := new(big.Int).Mul(&totalFees, big.NewInt(int64(cfg.BurnPercent)))
			burn.Div(burn, big.NewInt(100))
			totalFees.Sub(&totalFees, burn)
			log.Debug().Uint64("block", block.Header.Number).
				Str("burned", burn.String()).Msg("rewards: fee burn applied")
		}
		// Send remaining fees to validator
		if totalFees.Sign() > 0 {
			chain.MintBalance(validator, &totalFees)
		}
	}

	log.Debug().
		Uint64("block", block.Header.Number).
		Str("validator", validator).
		Str("reward_wei", reward.String()).
		Int("tx_fees_wei", int(totalFees.Int64())).
		Msg("rewards: block reward applied")
}

// effectiveReward calculates the block reward at a given block height,
// accounting for configured halving intervals.
func effectiveReward(cfg *RewardConfig, blockNumber uint64) *big.Int {
	reward := new(big.Int).Set(cfg.BlockReward)
	if cfg.HalvingInterval == 0 || blockNumber == 0 {
		return reward
	}
	halvings := blockNumber / cfg.HalvingInterval
	if halvings > 64 {
		halvings = 64 // prevent underflow to zero
	}
	reward.Rsh(reward, uint(halvings))
	return reward
}

// ── ValidatorUptime monitoring ─────────────────────────────────────────────────

// MissedSlotPenalty is called when a validator fails to propose a block in its slot.
// Currently just logs the miss; future versions can slash stake via the contract.
func MissedSlotPenalty(validatorAddr string, expectedBlock uint64) {
	log.Warn().
		Str("validator", validatorAddr).
		Uint64("expected_block", expectedBlock).
		Msg("consensus: validator missed proposal slot")
}

// UptimeTracker tracks how many slots each validator has proposed vs missed.
type UptimeTracker struct {
	proposed map[string]uint64
	missed   map[string]uint64
}

func NewUptimeTracker() *UptimeTracker {
	return &UptimeTracker{
		proposed: make(map[string]uint64),
		missed:   make(map[string]uint64),
	}
}

func (t *UptimeTracker) RecordProposal(validatorAddr string) {
	addr := strings.ToLower(validatorAddr)
	t.proposed[addr]++
}

func (t *UptimeTracker) RecordMiss(validatorAddr string) {
	addr := strings.ToLower(validatorAddr)
	t.missed[addr]++
	MissedSlotPenalty(addr, 0)
}

func (t *UptimeTracker) Uptime(validatorAddr string) float64 {
	addr := strings.ToLower(validatorAddr)
	total := t.proposed[addr] + t.missed[addr]
	if total == 0 {
		return 100.0
	}
	return float64(t.proposed[addr]) / float64(total) * 100.0
}

func (t *UptimeTracker) Stats() map[string]map[string]interface{} {
	result := make(map[string]map[string]interface{})
	for addr, p := range t.proposed {
		m := t.missed[addr]
		result[addr] = map[string]interface{}{
			"proposed": p,
			"missed":   m,
			"uptime":   t.Uptime(addr),
		}
	}
	return result
}
