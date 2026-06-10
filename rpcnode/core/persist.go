package core

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math/big"
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"
	"github.com/gydschain/rpcnode/storage"
)

var (
	blkPrefix = []byte("blk:")
	accPrefix = []byte("acc:")
)

type accountStore struct {
	Balance string `json:"balance"`
	Nonce   uint64 `json:"nonce"`
}

func blkKey(num uint64) []byte {
	key := make([]byte, 4+8)
	copy(key, blkPrefix)
	binary.BigEndian.PutUint64(key[4:], num)
	return key
}

func accKey(addr string) []byte {
	return append(append([]byte{}, accPrefix...), []byte(addr)...)
}

func (c *Chain) openDB() error {
	if c.dataDir == "" {
		return nil
	}
	dbPath := filepath.Join(c.dataDir, "state.db")
	if err := os.MkdirAll(c.dataDir, 0o755); err != nil {
		return fmt.Errorf("creating data dir: %w", err)
	}
	db, err := storage.NewLevelDB(dbPath)
	if err != nil {
		return fmt.Errorf("opening LevelDB at %s: %w", dbPath, err)
	}
	c.db = db
	log.Info().Str("path", dbPath).Msg("LevelDB state database opened")
	return nil
}

func (c *Chain) Close() {
	if c.db != nil {
		c.db.Close()
		c.db = nil
	}
}

func (c *Chain) persistBlock(b *Block) {
	if c.db == nil {
		return
	}
	batch := c.db.NewBatch()
	blockData, err := json.Marshal(b)
	if err != nil {
		return
	}
	batch.Put(blkKey(b.Header.Number), blockData)
	for _, addr := range touchedAddresses(b) {
		c.accountsMu.RLock()
		state, ok := c.accounts[addr]
		c.accountsMu.RUnlock()
		if !ok {
			continue
		}
		encoded, err := json.Marshal(accountStore{Balance: state.Balance.String(), Nonce: state.Nonce})
		if err != nil {
			continue
		}
		batch.Put(accKey(addr), encoded)
	}
	batch.Write()
}

func (c *Chain) loadFromDB() error {
	if c.db == nil {
		return nil
	}
	blkIter := c.db.Iterator(blkPrefix)
	defer blkIter.Release()
	loaded := 0
	for blkIter.Next() {
		var b Block
		if err := json.Unmarshal(blkIter.Value(), &b); err != nil {
			continue
		}
		if b.Header.Number == 0 {
			continue
		}
		c.addBlock(&b)
		c.txMu.Lock()
		for _, tx := range b.Transactions {
			c.txIndex[tx.Hash] = tx
		}
		c.txMu.Unlock()
		loaded++
	}
	accIter := c.db.Iterator(accPrefix)
	defer accIter.Release()
	for accIter.Next() {
		addr := string(accIter.Key()[len(accPrefix):])
		var as accountStore
		if err := json.Unmarshal(accIter.Value(), &as); err != nil {
			continue
		}
		bal, ok := new(big.Int).SetString(as.Balance, 10)
		if !ok {
			bal = big.NewInt(0)
		}
		c.accountsMu.Lock()
		c.accounts[addr] = &AccountState{Balance: bal, Nonce: as.Nonce}
		c.accountsMu.Unlock()
	}
	if loaded > 0 {
		log.Info().Int("blocks", loaded).Uint64("height", c.Height()).Msg("Chain state restored from LevelDB")
	}
	return nil
}

func touchedAddresses(b *Block) []string {
	seen := make(map[string]struct{}, len(b.Transactions)*2)
	for _, tx := range b.Transactions {
		if tx.From != "" {
			seen[strings.ToLower(tx.From)] = struct{}{}
		}
		if tx.To != "" {
			seen[strings.ToLower(tx.To)] = struct{}{}
		}
	}
	addrs := make([]string, 0, len(seen))
	for addr := range seen {
		addrs = append(addrs, addr)
	}
	return addrs
}
