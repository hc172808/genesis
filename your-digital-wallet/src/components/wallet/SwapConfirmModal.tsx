import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowDown, Shield, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { SwapQuote } from "@/lib/dex-swap";
import CoinIcon from "@/components/wallet/CoinIcon";

interface SwapConfirmModalProps {
  open: boolean;
  quote: SwapQuote | null;
  slippage: number;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

const SwapConfirmModal = ({ open, quote, slippage, onClose, onConfirm }: SwapConfirmModalProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    if (!password) { setError("Enter your wallet password"); return; }
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(password);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setPassword(""); onClose(); }, 1500);
    } catch (err: any) {
      setError(err?.message || "Swap failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!quote) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-foreground">Confirm Swap</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Token flow */}
            <div className="space-y-2">
              <div className="bg-secondary/50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">You Pay</p>
                  <p className="text-xl font-display font-bold text-foreground">{quote.fromAmount} {quote.fromToken.symbol}</p>
                </div>
                <CoinIcon symbol={quote.fromToken.symbol} size={40} fallbackColor={quote.fromToken.color} />
              </div>
              <div className="flex justify-center"><ArrowDown size={20} className="text-primary" /></div>
              <div className="bg-secondary/50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">You Receive</p>
                  <p className="text-xl font-display font-bold text-foreground">{quote.toAmount} {quote.toToken.symbol}</p>
                </div>
                <CoinIcon symbol={quote.toToken.symbol} size={40} fallbackColor={quote.toToken.color} />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="text-foreground">1 {quote.fromToken.symbol} = {quote.rate} {quote.toToken.symbol}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee (0.3%)</span><span className="text-foreground">{quote.fee} {quote.toToken.symbol}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price Impact</span><span className={quote.priceImpact > 2 ? "text-destructive" : "text-foreground"}>{quote.priceImpact}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Min. Received</span><span className="text-foreground">{quote.minimumReceived} {quote.toToken.symbol}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Slippage</span><span className="text-foreground">{slippage}%</span></div>
            </div>

            {/* Password */}
            <div className="bg-secondary/50 rounded-xl p-3 flex items-center gap-3">
              <Shield size={16} className="text-primary shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Wallet password to sign"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-primary">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {success ? (
              <div className="flex items-center justify-center gap-2 text-[hsl(var(--success))] py-3">
                <CheckCircle2 size={20} /> <span className="font-semibold">Swap Successful!</span>
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full gradient-primary text-primary-foreground font-display font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-opacity glow-primary disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 size={18} className="animate-spin" /> Signing...</> : "Confirm Swap"}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SwapConfirmModal;
