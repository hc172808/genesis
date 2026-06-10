package rpc

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"

	"github.com/gydschain/validatornode/consensus"
	"github.com/gydschain/validatornode/core"
)

type Server struct {
	chain      *core.Chain
	vs         *consensus.ValidatorSet
	router     *mux.Router
	httpServer *http.Server
	upgrader   websocket.Upgrader
	subs       map[string]*subscriber
	subsMu     sync.RWMutex
	port       int
	host       string

	pendingTx   map[string]*core.Transaction
	pendingTxMu sync.RWMutex
}

type subscriber struct {
	conn *websocket.Conn
	ch   chan interface{}
}

func NewServer(chain *core.Chain, vs *consensus.ValidatorSet, port int, host string) *Server {
	s := &Server{
		chain: chain,
		vs:    vs,
		port:  port,
		host:  host,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
		subs:      make(map[string]*subscriber),
		pendingTx: make(map[string]*core.Transaction),
	}
	s.setupRoutes()
	return s
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) setupRoutes() {
	r := mux.NewRouter()
	r.HandleFunc("/health", s.handleHealth).Methods("GET")
	r.HandleFunc("/", s.handleJSONRPC).Methods("POST", "OPTIONS")
	r.HandleFunc("/rpc", s.handleJSONRPC).Methods("POST", "OPTIONS")

	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/status", s.handleStatus).Methods("GET")
	api.HandleFunc("/blocks", s.handleBlocks).Methods("GET")
	api.HandleFunc("/blocks/{id}", s.handleBlock).Methods("GET")
	api.HandleFunc("/validator", s.handleValidatorStatus).Methods("GET")
	api.HandleFunc("/ws", s.handleWS)

	r.Use(cors)
	s.router = r
}

func (s *Server) Start() error {
	s.httpServer = &http.Server{
		Addr:         fmt.Sprintf("%s:%d", s.host, s.port),
		Handler:      s.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}
	log.Info().Str("addr", fmt.Sprintf("%s:%d", s.host, s.port)).Msg("Validator RPC server listening")
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}

func (s *Server) NotifyNewBlock(b *core.Block) {
	s.broadcast(map[string]interface{}{"type": "newBlock", "data": b.ToMap()})
}

func (s *Server) broadcast(msg interface{}) {
	s.subsMu.RLock()
	defer s.subsMu.RUnlock()
	for _, sub := range s.subs {
		select {
		case sub.ch <- msg:
		default:
		}
	}
}

func jsonOK(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func jsonErr(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, map[string]interface{}{"status": "ok", "mode": "validator", "height": s.chain.Height()})
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, s.chain.Stats())
}

func (s *Server) handleValidatorStatus(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, map[string]interface{}{
		"validators": s.vs.Validators(),
		"stakes":     s.vs.Stakes(),
	})
}

func (s *Server) handleBlocks(w http.ResponseWriter, r *http.Request) {
	limit := 20
	if ls := r.URL.Query().Get("limit"); ls != "" {
		if n, err := strconv.Atoi(ls); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}
	blocks := s.chain.LatestBlocks(limit)
	out := make([]map[string]interface{}, len(blocks))
	for i, b := range blocks {
		out[i] = b.ToMap()
	}
	jsonOK(w, map[string]interface{}{"blocks": out, "count": len(out)})
}

func (s *Server) handleBlock(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var block *core.Block
	var err error
	if num, e := strconv.ParseUint(id, 10, 64); e == nil {
		block, err = s.chain.GetByNumber(num)
	} else {
		block, err = s.chain.GetByHash(id)
	}
	if err != nil {
		jsonErr(w, http.StatusNotFound, "block not found")
		return
	}
	jsonOK(w, map[string]interface{}{"block": block.ToMap()})
}

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	id := fmt.Sprintf("%p", conn)
	sub := &subscriber{conn: conn, ch: make(chan interface{}, 32)}
	s.subsMu.Lock()
	s.subs[id] = sub
	s.subsMu.Unlock()
	defer func() {
		s.subsMu.Lock()
		delete(s.subs, id)
		s.subsMu.Unlock()
		conn.Close()
	}()
	go func() {
		for msg := range sub.ch {
			conn.WriteJSON(msg)
		}
	}()
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}

type jsonRPCRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
	ID      interface{}   `json:"id"`
}

type jsonRPCResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	Result  interface{} `json:"result,omitempty"`
	Error   interface{} `json:"error,omitempty"`
	ID      interface{} `json:"id"`
}

func (s *Server) handleJSONRPC(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var raw json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		jsonErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if len(raw) > 0 && raw[0] == '[' {
		var reqs []jsonRPCRequest
		if err := json.Unmarshal(raw, &reqs); err != nil {
			jsonErr(w, http.StatusBadRequest, "invalid batch JSON")
			return
		}
		responses := make([]jsonRPCResponse, len(reqs))
		for i, req := range reqs {
			responses[i] = s.dispatch(req)
		}
		json.NewEncoder(w).Encode(responses)
		return
	}
	var req jsonRPCRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		jsonErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	json.NewEncoder(w).Encode(s.dispatch(req))
}

func paramStr(params []interface{}, idx int) string {
	if len(params) > idx {
		if s, ok := params[idx].(string); ok {
			return s
		}
	}
	return ""
}

func (s *Server) dispatch(req jsonRPCRequest) jsonRPCResponse {
	resp := jsonRPCResponse{JSONRPC: "2.0", ID: req.ID}
	switch req.Method {
	case "eth_blockNumber":
		resp.Result = fmt.Sprintf("0x%x", s.chain.Height())
	case "eth_chainId":
		resp.Result = fmt.Sprintf("0x%x", s.chain.Stats()["chainId"])
	case "net_version":
		resp.Result = fmt.Sprintf("%v", s.chain.Stats()["chainId"])
	case "net_listening":
		resp.Result = true
	case "net_peerCount":
		resp.Result = "0x0"
	case "eth_syncing":
		resp.Result = false
	case "web3_clientVersion":
		resp.Result = "GYDS-Validator/v1.0.0/linux/go1.21"
	case "eth_gasPrice":
		resp.Result = "0x3B9ACA00"
	case "eth_estimateGas":
		resp.Result = "0x5208"
	case "eth_getBalance":
		addr := paramStr(req.Params, 0)
		resp.Result = fmt.Sprintf("0x%x", s.chain.GetBalance(addr))
	case "eth_getTransactionCount":
		addr := paramStr(req.Params, 0)
		resp.Result = fmt.Sprintf("0x%x", s.chain.GetNonce(addr))
	case "eth_getBlockByNumber":
		numStr := paramStr(req.Params, 0)
		if numStr == "latest" || numStr == "" {
			if head := s.chain.Head(); head != nil {
				resp.Result = blockToRPC(head)
			}
		} else {
			var num uint64
			fmt.Sscanf(numStr, "0x%x", &num)
			if b, err := s.chain.GetByNumber(num); err == nil {
				resp.Result = blockToRPC(b)
			}
		}
	case "eth_sendRawTransaction":
		raw := paramStr(req.Params, 0)
		txHash := hashRawTx(raw)
		s.pendingTxMu.Lock()
		s.pendingTx[txHash] = &core.Transaction{
			Hash:      txHash,
			From:      "0x0000000000000000000000000000000000000000",
			To:        "0x0000000000000000000000000000000000000000",
			Value:     big.NewInt(0),
			GasLimit:  21000,
			GasPrice:  big.NewInt(1_000_000_000),
			GasUsed:   21000,
			Status:    "pending",
			Timestamp: time.Now().Unix(),
		}
		s.pendingTxMu.Unlock()
		resp.Result = txHash
	case "gyds_validatorSet":
		resp.Result = map[string]interface{}{
			"validators": s.vs.Validators(),
			"stakes":     s.vs.Stakes(),
		}
	default:
		resp.Error = map[string]interface{}{
			"code":    -32601,
			"message": fmt.Sprintf("method %s not found", req.Method),
		}
	}
	return resp
}

func blockToRPC(b *core.Block) map[string]interface{} {
	txHashes := make([]string, len(b.Transactions))
	for i, tx := range b.Transactions {
		txHashes[i] = tx.Hash
	}
	return map[string]interface{}{
		"number":           fmt.Sprintf("0x%x", b.Header.Number),
		"hash":             b.Hash,
		"parentHash":       b.Header.ParentHash,
		"miner":            b.Header.Validator,
		"gasLimit":         fmt.Sprintf("0x%x", b.Header.GasLimit),
		"gasUsed":          fmt.Sprintf("0x%x", b.Header.GasUsed),
		"timestamp":        fmt.Sprintf("0x%x", b.Header.Timestamp),
		"transactions":     txHashes,
		"difficulty":       "0x1",
		"extraData":        "0x",
		"baseFeePerGas":    "0x3B9ACA00",
		"uncles":           []string{},
		"logsBloom":        "0x" + strings.Repeat("0", 512),
		"nonce":            "0x0000000000000000",
		"sha3Uncles":       "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
	}
}

func hashRawTx(raw string) string {
	raw = strings.TrimPrefix(raw, "0x")
	b, _ := hex.DecodeString(raw)
	if len(b) == 0 {
		b = []byte(raw)
	}
	sum := sha256.Sum256(b)
	return "0x" + hex.EncodeToString(sum[:])
}
