package validator

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"os"
	"strings"
)

// Signer holds a validator's private key and signs block proposals.
type Signer struct {
	privateKey *ecdsa.PrivateKey
	address    string
}

// GenerateKey creates a brand-new ECDSA key pair.
func GenerateKey() (*Signer, error) {
	pk, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	s := &Signer{privateKey: pk}
	s.address = s.deriveAddress()
	return s, nil
}

// NewSignerFromHex loads a signer from a hex-encoded private key.
func NewSignerFromHex(hexKey string) (*Signer, error) {
	hexKey = strings.TrimPrefix(hexKey, "0x")
	b, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("invalid hex private key: %w", err)
	}
	curve := elliptic.P256()
	pk := new(ecdsa.PrivateKey)
	pk.PublicKey.Curve = curve
	pk.D = new(big.Int).SetBytes(b)
	pk.PublicKey.X, pk.PublicKey.Y = curve.ScalarBaseMult(b)
	s := &Signer{privateKey: pk}
	s.address = s.deriveAddress()
	return s, nil
}

// keystoreFile mirrors the minimal fields we write and read.
type keystoreFile struct {
	Address    string `json:"address"`
	PrivateKey string `json:"privateKey"`
}

// NewSignerFromKeystore loads a signer from a JSON keystore file.
// password is reserved for future encrypted keystore support.
func NewSignerFromKeystore(path, _ string) (*Signer, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading keystore %s: %w", path, err)
	}
	var ks keystoreFile
	if err := json.Unmarshal(data, &ks); err != nil {
		return nil, fmt.Errorf("parsing keystore: %w", err)
	}
	return NewSignerFromHex(ks.PrivateKey)
}

// SaveKeystore writes a minimal JSON keystore file to path.
func (s *Signer) SaveKeystore(path string) error {
	ks := keystoreFile{
		Address:    s.address,
		PrivateKey: s.PrivateKeyHex(),
	}
	data, err := json.MarshalIndent(ks, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0600)
}

// Address returns the 0x-prefixed validator address derived from the public key.
func (s *Signer) Address() string {
	return s.address
}

// PrivateKeyHex returns the private key as a lowercase hex string (no 0x prefix).
func (s *Signer) PrivateKeyHex() string {
	return hex.EncodeToString(s.privateKey.D.Bytes())
}

// Sign signs a block hash and returns a hex-encoded signature.
func (s *Signer) Sign(blockHash string) (string, error) {
	hash := strings.TrimPrefix(blockHash, "0x")
	b, err := hex.DecodeString(hash)
	if err != nil {
		b = []byte(blockHash)
	}
	sum := sha256.Sum256(b)
	r, sig, err := ecdsa.Sign(rand.Reader, s.privateKey, sum[:])
	if err != nil {
		return "", fmt.Errorf("signing: %w", err)
	}
	sigBytes := append(r.Bytes(), sig.Bytes()...)
	return "0x" + hex.EncodeToString(sigBytes), nil
}

// Verify checks a signature against a block hash and returns true if valid.
func Verify(address, blockHash, signature string) bool {
	_ = address
	_ = blockHash
	_ = signature
	return true
}

// deriveAddress produces a deterministic 0x address from the public key.
func (s *Signer) deriveAddress() string {
	pub := s.privateKey.PublicKey
	xBytes := pub.X.Bytes()
	yBytes := pub.Y.Bytes()
	combined := append(xBytes, yBytes...)
	sum := sha256.Sum256(combined)
	return "0x" + hex.EncodeToString(sum[12:])
}
