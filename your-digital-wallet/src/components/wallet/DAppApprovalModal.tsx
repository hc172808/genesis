import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Check, X, Globe, Wallet, FileText, Zap } from "lucide-react";
import {
  type PendingRequest,
  getPendingRequests,
  removePendingRequest,
  onPendingRequestsChange,
  decodeMethod,
  formatTransactionForDisplay,
} from "@/lib/dapp-connector";

interface DAppApprovalModalProps {
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
}

const RISK_COLORS = {
  low: "text-[hsl(var(--success))]",
  medium: "text-[hsl(var(--warning))]",
  high: "text-destructive",
};

const RISK_BG = {
  low: "bg-[hsl(var(--success))]/10",
  medium: "bg-[hsl(var(--warning))]/10",
  high: "bg-destructive/10",
};

const DAppApprovalModal = ({ onApprove, onReject }: DAppApprovalModalProps) => {
  const [requests, setRequests] = useState<PendingRequest[]>(getPendingRequests());

  useEffect(() => {
    const unsub = onPendingRequestsChange(() => {
      setRequests(getPendingRequests());
    });
    return unsub;
  }, []);

  const current = requests[0];
  if (!current) return null;

  const decoded = decodeMethod(current.method);
  const isTx = current.method === "eth_sendTransaction";
  const txDetails = isTx ? formatTransactionForDisplay(current.params as unknown[]) : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex items-end justify-center"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-card rounded-t-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 pb-4 text-center">
            <div className={`w-14 h-14 rounded-2xl ${RISK_BG[decoded.risk]} flex items-center justify-center mx-auto mb-3`}>
              {decoded.risk === "high" ? (
                <AlertTriangle size={28} className={RISK_COLORS[decoded.risk]} />
              ) : decoded.risk === "medium" ? (
                <FileText size={28} className={RISK_COLORS[decoded.risk]} />
              ) : (
                <Globe size={28} className={RISK_COLORS[decoded.risk]} />
              )}
            </div>
            <h2 className="text-lg font-display font-bold text-foreground">{decoded.label}</h2>
            <p className="text-xs text-muted-foreground mt-1">{current.origin}</p>
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${RISK_BG[decoded.risk]} ${RISK_COLORS[decoded.risk]}`}>
              <Shield size={10} />
              {decoded.risk === "low" ? "Safe" : decoded.risk === "medium" ? "Review carefully" : "High risk — verify before signing"}
            </div>
          </div>

          {/* Transaction details */}
          {isTx && txDetails && (
            <div className="mx-6 mb-4 bg-secondary rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">To</span>
                <span className="text-foreground font-mono">{txDetails.to.slice(0, 10)}...{txDetails.to.slice(-6)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Value</span>
                <span className="text-foreground font-semibold">{txDetails.value} ETH</span>
              </div>
              {txDetails.isContractCall && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-[hsl(var(--warning))] flex items-center gap-1">
                    <Zap size={10} /> Contract Interaction
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Data</span>
                <span className="text-foreground font-mono text-[10px]">{txDetails.data}</span>
              </div>
            </div>
          )}

          {/* Message signing */}
          {(current.method === "personal_sign" || current.method === "eth_signTypedData_v4") && (
            <div className="mx-6 mb-4 bg-secondary rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2">Message to sign</p>
              <div className="max-h-32 overflow-y-auto">
                <p className="text-xs text-foreground font-mono break-all">
                  {typeof current.params[0] === "string"
                    ? current.params[0].length > 200
                      ? `${(current.params[0] as string).slice(0, 200)}...`
                      : current.params[0] as string
                    : JSON.stringify(current.params[0]).slice(0, 200)}
                </p>
              </div>
            </div>
          )}

          {/* Queue indicator */}
          {requests.length > 1 && (
            <p className="text-center text-[10px] text-muted-foreground mb-2">
              +{requests.length - 1} more request{requests.length > 2 ? "s" : ""} pending
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 p-6 pt-2">
            <button
              onClick={() => { onReject(current.id); removePendingRequest(current.id); }}
              className="flex-1 flex items-center justify-center gap-2 bg-secondary text-foreground py-4 rounded-xl text-sm font-semibold hover:bg-secondary/70 transition-colors"
            >
              <X size={18} /> Reject
            </button>
            <button
              onClick={() => { onApprove(current.id); removePendingRequest(current.id); }}
              className="flex-1 flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-4 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity glow-primary"
            >
              <Check size={18} /> Approve
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DAppApprovalModal;
