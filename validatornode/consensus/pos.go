package consensus

import (
	"math/rand"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/gydschain/validatornode/core"
	"github.com/gydschain/validatornode/validator"
)

// ValidatorSet tracks the set of active validators and their stakes.
type ValidatorSet struct {
	mu         sync.RWMutex
	validators []string
	stakes     map[string]int64
}

func NewValidatorSet(validators []string) *ValidatorSet {
	vs := &ValidatorSet{
		validators: validators,
		stakes:     make(map[string]int64),
	}
	for _, v := range validators {
		vs.stakes[v] = 1_000_000
	}
	return vs
}

func (vs *ValidatorSet) SelectProposer(blockNum uint64) string {
	vs.mu.RLock()
	defer vs.mu.RUnlock()
	if len(vs.validators) == 0 {
		return "0x0000000000000000000000000000000000000001"
	}
	idx := int(blockNum) % len(vs.validators)
	return vs.validators[idx]
}

func (vs *ValidatorSet) Contains(addr string) bool {
	vs.mu.RLock()
	defer vs.mu.RUnlock()
	for _, v := range vs.validators {
		if v == addr {
			return true
		}
	}
	return false
}

func (vs *ValidatorSet) AddValidator(addr string, stake int64) {
	vs.mu.Lock()
	defer vs.mu.Unlock()
	vs.validators = append(vs.validators, addr)
	vs.stakes[addr] = stake
}

func (vs *ValidatorSet) Validators() []string {
	vs.mu.RLock()
	defer vs.mu.RUnlock()
	out := make([]string, len(vs.validators))
	copy(out, vs.validators)
	return out
}

func (vs *ValidatorSet) Stakes() map[string]int64 {
	vs.mu.RLock()
	defer vs.mu.RUnlock()
	out := make(map[string]int64, len(vs.stakes))
	for k, v := range vs.stakes {
		out[k] = v
	}
	return out
}

// PoSEngine drives the consensus loop. When this node is the selected proposer
// for the next block it builds, signs, and commits the block. Otherwise it
// observes and waits for the block to arrive via P2P.
type PoSEngine struct {
	vs         *ValidatorSet
	chain      *core.Chain
	signer     *validator.Signer
	blockTime  time.Duration
	quit       chan struct{}
	newBlockFn func(*core.Block)
	rng        *rand.Rand

	mu           sync.Mutex
	blocksProposed uint64
	blocksMissed   uint64
}

func NewPoSEngine(chain *core.Chain, vs *ValidatorSet, signer *validator.Signer, blockTime time.Duration) *PoSEngine {
	return &PoSEngine{
		vs:        vs,
		chain:     chain,
		signer:    signer,
		blockTime: blockTime,
		quit:      make(chan struct{}),
		rng:       rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (e *PoSEngine) OnNewBlock(fn func(*core.Block)) {
	e.newBlockFn = fn
}

func (e *PoSEngine) Start() {
	go e.loop()
}

func (e *PoSEngine) Stop() {
	close(e.quit)
}

func (e *PoSEngine) Stats() map[string]interface{} {
	e.mu.Lock()
	defer e.mu.Unlock()
	return map[string]interface{}{
		"validatorAddress": e.signer.Address(),
		"blocksProposed":   e.blocksProposed,
		"blocksMissed":     e.blocksMissed,
		"validators":       e.vs.Validators(),
	}
}

func (e *PoSEngine) loop() {
	ticker := time.NewTicker(e.blockTime)
	defer ticker.Stop()
	for {
		select {
		case <-e.quit:
			return
		case <-ticker.C:
			e.tick()
		}
	}
}

func (e *PoSEngine) tick() {
	head := e.chain.Head()
	if head == nil {
		return
	}
	nextNum := head.Header.Number + 1
	proposer := e.vs.SelectProposer(nextNum)

	if proposer == e.signer.Address() {
		e.proposeBlock(head, nextNum)
	} else {
		log.Debug().
			Uint64("block", nextNum).
			Str("proposer", proposer).
			Msg("Not our turn — waiting for block from proposer")
	}
}

func (e *PoSEngine) proposeBlock(parent *core.Header, nextNum uint64) {
	txCount := e.rng.Intn(8)
	txs := make([]*core.Transaction, txCount)
	for i := range txs {
		to := e.vs.SelectProposer(nextNum + uint64(i+1))
		txs[i] = core.NewTransaction(e.signer.Address(), to, nil, uint64(i), nil)
		txs[i].Status = "success"
		txs[i].BlockNum = nextNum
	}

	blk := core.NewBlock(parent, e.signer.Address(), txs)

	sig, err := e.signer.Sign(blk.Hash)
	if err != nil {
		log.Error().Err(err).Uint64("block", nextNum).Msg("Failed to sign block — skipping")
		e.mu.Lock()
		e.blocksMissed++
		e.mu.Unlock()
		return
	}
	blk.Signature = sig

	if err := e.chain.InsertBlock(blk); err != nil {
		log.Warn().Err(err).Uint64("block", nextNum).Msg("Failed to insert proposed block")
		e.mu.Lock()
		e.blocksMissed++
		e.mu.Unlock()
		return
	}

	e.mu.Lock()
	e.blocksProposed++
	e.mu.Unlock()

	log.Info().
		Uint64("number", blk.Header.Number).
		Str("hash", blk.Hash[:16]+"...").
		Str("signature", sig[:16]+"...").
		Int("txs", len(blk.Transactions)).
		Msg("Block proposed and committed")

	if e.newBlockFn != nil {
		e.newBlockFn(blk)
	}
}
