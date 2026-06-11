package core

import (
	"math/big"
	"strings"
)

// MintBalance credits wei to an address.
// Used by the consensus engine to apply block rewards and tx fee payouts.
// It creates the account if it does not already exist.
func (c *Chain) MintBalance(address string, amount *big.Int) {
	if amount == nil || amount.Sign() <= 0 {
		return
	}
	addr := strings.ToLower(address)

	c.accountsMu.Lock()
	defer c.accountsMu.Unlock()

	acct, ok := c.accounts[addr]
	if !ok {
		acct = &AccountState{Balance: big.NewInt(0), Nonce: 0}
		c.accounts[addr] = acct
	}
	acct.Balance = new(big.Int).Add(acct.Balance, amount)
}

// BurnBalance destroys wei from an address (fee burn mechanism).
// Returns the amount actually burned (min of amount, balance).
func (c *Chain) BurnBalance(address string, amount *big.Int) *big.Int {
	if amount == nil || amount.Sign() <= 0 {
		return big.NewInt(0)
	}
	addr := strings.ToLower(address)

	c.accountsMu.Lock()
	defer c.accountsMu.Unlock()

	acct, ok := c.accounts[addr]
	if !ok {
		return big.NewInt(0)
	}
	burned := new(big.Int).Set(amount)
	if burned.Cmp(acct.Balance) > 0 {
		burned.Set(acct.Balance)
	}
	acct.Balance = new(big.Int).Sub(acct.Balance, burned)
	return burned
}
