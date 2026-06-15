import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Server, Globe, Wallet, CheckCircle2, XCircle, Loader2, Plus } from "lucide-react";
import QrScanner from "./QrScanner";
import { parseQrData, addScannedNode, connectScannedDApp, testRpcEndpoint, type QrConnectResult } from "@/lib/qr-connect";
import { useToast } from "@/hooks/use-toast";

interface QrConnectScannerProps {
  onConnect?: () => void;
}

const TYPE_META: Record<string, { icon: typeof Server; label: string; color: string }> = {
  rpc_node: { icon: Server, label: "RPC Node", color: "text-primary" },
  dapp_site: { icon: Globe, label: "Website / dApp", color: "text-accent" },
  wallet_address: { icon: Wallet, label: "Wallet Address", color: "text-[hsl(var(--success))]" },
  unknown: { icon: QrCode, label: "Unknown", color: "text-muted-foreground" },
};

const QrConnectScanner = ({ onConnect }: QrConnectScannerProps) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [result, setResult] = useState<QrConnectResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latency?: number; chainId?: number } | null>(null);
  const { toast } = useToast();

  const handleScan = (data: string) => {
    const parsed = parseQrData(data);
    setResult(parsed);
    setTestResult(null);

    if (parsed.type === "rpc_node" && parsed.data.url) {
      // Auto-test the endpoint
      setTesting(true);
      testRpcEndpoint(parsed.data.url).then((res) => {
        setTestResult(res);
        setTesting(false);
      });
    }
  };

  const handleAddNode = () => {
    if (!result || result.type !== "rpc_node") return;
    const added = addScannedNode(result.data.url, result.data.name);
    if (added) {
      toast({ title: "Node added!", description: `${result.data.name || result.data.url} added to your RPC list.` });
      onConnect?.();
    } else {
      toast({ title: "Already exists", description: "This node is already in your list." });
    }
    setResult(null);
  };

  const handleConnectDApp = () => {
    if (!result || result.type !== "dapp_site") return;
    connectScannedDApp(result.data.origin, result.data.name);
    toast({ title: "Connected!", description: `${result.data.name} is now connected.` });
    onConnect?.();
    setResult(null);
  };

  const handleCopyAddress = () => {
    if (!result || result.type !== "wallet_address") return;
    navigator.clipboard.writeText(result.data.address);
    toast({ title: "Address copied" });
    setResult(null);
  };

  const meta = result ? TYPE_META[result.type] : null;
  const Icon = meta?.icon || QrCode;

  return (
    <>
      <button
        onClick={() => { setScannerOpen(true); setResult(null); setTestResult(null); }}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-card hover:bg-secondary/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
          <QrCode size={18} className="text-primary-foreground" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">Scan QR to Connect</p>
          <p className="text-xs text-muted-foreground">Add nodes, connect dApps, or scan addresses</p>
        </div>
      </button>

      <QrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />

      {/* Result Modal */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card rounded-2xl p-6 space-y-4 border border-border"
            >
              {/* Type badge */}
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-secondary flex items-center justify-center ${meta?.color}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{meta?.label}</p>
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                </div>
              </div>

              {/* RPC Node Details */}
              {result.type === "rpc_node" && (
                <div className="space-y-3">
                  <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Endpoint</p>
                    <p className="text-sm font-mono text-foreground break-all">{result.data.url}</p>
                  </div>
                  {result.data.name && result.data.name !== result.data.url && (
                    <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="text-sm text-foreground">{result.data.name}</p>
                    </div>
                  )}

                  {/* Test result */}
                  <div className="flex items-center gap-2">
                    {testing ? (
                      <>
                        <Loader2 size={16} className="text-muted-foreground animate-spin" />
                        <span className="text-xs text-muted-foreground">Testing endpoint...</span>
                      </>
                    ) : testResult?.ok ? (
                      <>
                        <CheckCircle2 size={16} className="text-[hsl(var(--success))]" />
                        <span className="text-xs text-[hsl(var(--success))]">
                          Online • {testResult.latency}ms
                          {testResult.chainId ? ` • Chain ID: ${testResult.chainId}` : ""}
                        </span>
                      </>
                    ) : testResult ? (
                      <>
                        <XCircle size={16} className="text-destructive" />
                        <span className="text-xs text-destructive">Endpoint unreachable</span>
                      </>
                    ) : null}
                  </div>

                  <button
                    onClick={handleAddNode}
                    disabled={testing}
                    className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Add Node
                  </button>
                </div>
              )}

              {/* dApp site */}
              {result.type === "dapp_site" && (
                <div className="space-y-3">
                  <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="text-sm text-foreground break-all">{result.data.url}</p>
                  </div>
                  <button
                    onClick={handleConnectDApp}
                    className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm"
                  >
                    Connect dApp
                  </button>
                </div>
              )}

              {/* Wallet address */}
              {result.type === "wallet_address" && (
                <div className="space-y-3">
                  <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-mono text-foreground break-all">{result.data.address}</p>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm"
                  >
                    Copy Address
                  </button>
                </div>
              )}

              {result.type === "unknown" && (
                <p className="text-sm text-muted-foreground">This QR code format is not supported. Try scanning an RPC endpoint, website URL, or wallet address.</p>
              )}

              <button
                onClick={() => setResult(null)}
                className="w-full py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default QrConnectScanner;
