import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownUp, ChevronDown, Settings2, Zap, Loader2, RefreshCw, TrendingDown } from "lucide-react";
import BottomNav from "@/components/wallet/BottomNav";
import SwapConfirmModal from "@/components/wallet/SwapConfirmModal";
import SwapChart from "@/components/wallet/SwapChart";
import SwapTokenPicker from "@/components/wallet/SwapTokenPicker";
import CoinIcon from "@/components/wallet/CoinIcon";
import { useToast } from "@/hooks/use-toast";
import { SWAP_TOKENS, fetchSwapPrices, getSwapQuote, executeSwap, type SwapToken, type SwapQuote } from "@/lib/dex-swap";
import { unlockWallet, getWalletAddress, checkLockout } from "@/lib/wallet-core";
import { saveTransaction } from "@/lib/transaction-history";
import { formatPrice } from "@/lib/price-fetcher";

const SLIPPAGE_OPTIONS = [0.5, 1.0, 2.0];

const Swap = () => {
  const { toast } = useToast();
  const [fromToken, setFromToken] = useState<SwapToken>(SWAP_TOKENS[0]);
  const [toToken, setToToken] = useState<SwapToken>(SWAP_TOKENS[2]);
  const [fromAmount, setFromAmount] = useState("");
  const [pickerMode, setPickerMode] = useState<"from" | "to" | null>(null);
  const [showSlippage, setShowSlippage] = useState(false);
  const [slippage, setSlippage] = useState(0.5);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const walletAddress = getWalletAddress();

  useEffect(() => {
    const load = async () => {
      setLoadingPrices(true);
      try {
        const p = await fetchSwapPrices();
        setPrices(p);
      } catch { /* silent */ }
      setLoadingPrices(false);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (fromAmount && Object.keys(prices).length > 0) {
      setQuote(getSwapQuote(fromToken, toToken, fromAmount, prices, slippage));
    } else {
      setQuote(null);
    }
  }, [fromAmount, fromToken, toToken, prices, slippage]);

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
  };

  const handleInitiateSwap = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast({ title: "Enter an amount", variant: "destructive" });
      return;
    }
    if (!quote) {
      toast({ title: "Unable to get quote", description: "Prices may be loading", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSwap = useCallback(async (password: string) => {
    if (!quote || !walletAddress) throw new Error("Missing quote or wallet");
    const lockStatus = checkLockout();
    if (lockStatus.locked) throw new Error(`Wallet locked for ${lockStatus.remainingSeconds}s`);
    const wallet = await unlockWallet(password);
    const txHash = await executeSwap(wallet, quote);
    saveTransaction({
      type: "swap",
      symbol: `${quote.fromToken.symbol}→${quote.toToken.symbol}`,
      amount: quote.fromAmount,
      toAddress: walletAddress,
      fromAddress: walletAddress,
      txHash,
      timestamp: Date.now(),
      status: "confirmed",
    });
    toast({ title: "Swap Complete!", description: `${quote.fromAmount} ${quote.fromToken.symbol} → ${quote.toAmount} ${quote.toToken.symbol}` });
    setFromAmount("");
  }, [quote, walletAddress, toast]);

  const handlePickerSelect = (token: SwapToken) => {
    if (pickerMode === "from") setFromToken(token);
    else if (pickerMode === "to") setToToken(token);
    setPickerMode(null);
  };

  const fromPrice = prices[fromToken.symbol] ?? 0;
  const toPrice = prices[toToken.symbol] ?? 0;
  const usdValue = fromAmount ? (parseFloat(fromAmount) * fromPrice).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Swap</h1>
            <div className="flex items-center gap-1.5 mt-1">
              {loadingPrices ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Fetching prices…</span>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" /> Live CoinGecko prices
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowSlippage(!showSlippage)}
            className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 size={20} />
          </button>
        </div>

        {/* Slippage settings */}
        <AnimatePresence>
          {showSlippage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2">Slippage Tolerance</p>
                <div className="flex gap-2">
                  {SLIPPAGE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        slippage === s
                          ? "gradient-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {/* From */}
          <div className="bg-card rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">You Pay</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-2xl font-display font-bold text-foreground outline-none placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => setPickerMode("from")}
                className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5 shrink-0 min-w-[100px] justify-center hover:bg-secondary/80 active:scale-95 transition-all"
              >
                <CoinIcon symbol={fromToken.symbol} size={22} fallbackColor={fromToken.color} />
                <span className="font-semibold text-foreground text-sm whitespace-nowrap">{fromToken.symbol}</span>
                <ChevronDown size={14} className="text-muted-foreground shrink-0" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">≈ ${usdValue}</p>
              <p className="text-xs text-muted-foreground">
                {fromPrice ? `1 ${fromToken.symbol} = ${formatPrice(fromPrice)}` : ""}
              </p>
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={handleSwapTokens}
              className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-lg hover:scale-110 transition-transform"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>

          {/* To */}
          <div className="bg-card rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">You Receive</p>
            <div className="flex items-center gap-3">
              <p className="flex-1 text-2xl font-display font-bold text-foreground">
                {quote?.toAmount || <span className="text-muted-foreground/40">0.00</span>}
              </p>
              <button
                onClick={() => setPickerMode("to")}
                className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5 shrink-0 min-w-[100px] justify-center hover:bg-secondary/80 active:scale-95 transition-all"
              >
                <CoinIcon symbol={toToken.symbol} size={22} fallbackColor={toToken.color} />
                <span className="font-semibold text-foreground text-sm whitespace-nowrap">{toToken.symbol}</span>
                <ChevronDown size={14} className="text-muted-foreground shrink-0" />
              </button>
            </div>
            {quote && toPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                ≈ ${(parseFloat(quote.toAmount) * toPrice).toFixed(2)}
              </p>
            )}
          </div>

          {/* Price chart */}
          <SwapChart fromToken={fromToken} toToken={toToken} />

          {/* Rate info */}
          {quote && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span className="text-foreground flex items-center gap-1">
                  <RefreshCw size={12} className="text-primary" />
                  1 {fromToken.symbol} = {quote.rate} {toToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fee</span>
                <span className="text-foreground flex items-center gap-1">
                  <Zap size={12} className="text-primary" /> {quote.fee} {toToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={`flex items-center gap-1 ${quote.priceImpact > 2 ? "text-destructive" : "text-foreground"}`}>
                  {quote.priceImpact > 1 && <TrendingDown size={12} />}
                  {quote.priceImpact}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Min. Received</span>
                <span className="text-foreground">{quote.minimumReceived} {toToken.symbol}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Slippage</span>
                <span className="text-foreground">{slippage}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Route</span>
                <span className="text-foreground">{quote.route}</span>
              </div>
            </motion.div>
          )}

          {/* Swap CTA */}
          <button
            onClick={handleInitiateSwap}
            disabled={!fromAmount || loadingPrices}
            className="w-full gradient-primary text-primary-foreground font-display font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-opacity glow-primary disabled:opacity-50"
          >
            {loadingPrices ? "Loading Prices…" : `Swap ${fromToken.symbol} → ${toToken.symbol}`}
          </button>
        </motion.div>
      </div>

      {/* Full-page token picker */}
      <AnimatePresence>
        {pickerMode && (
          <SwapTokenPicker
            onSelect={handlePickerSelect}
            onClose={() => setPickerMode(null)}
            exclude={pickerMode === "from" ? toToken.symbol : fromToken.symbol}
            prices={prices}
          />
        )}
      </AnimatePresence>

      {/* Confirm modal */}
      <SwapConfirmModal
        open={confirmOpen}
        quote={quote}
        slippage={slippage}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSwap}
      />

      <BottomNav />
    </div>
  );
};

export default Swap;
