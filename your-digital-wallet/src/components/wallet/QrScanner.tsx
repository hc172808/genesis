import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
}

const extractAddress = (data: string): string => {
  // Handle EIP-681 format: ethereum:0x...@chainId or ethereum:0x...
  if (data.startsWith("ethereum:")) {
    const withoutPrefix = data.slice(9);
    const atIndex = withoutPrefix.indexOf("@");
    const slashIndex = withoutPrefix.indexOf("/");
    const end = Math.min(
      atIndex > -1 ? atIndex : Infinity,
      slashIndex > -1 ? slashIndex : Infinity,
      withoutPrefix.indexOf("?") > -1 ? withoutPrefix.indexOf("?") : Infinity
    );
    return end === Infinity ? withoutPrefix : withoutPrefix.slice(0, end);
  }
  // Plain address
  if (/^0x[a-fA-F0-9]{40}$/.test(data.trim())) {
    return data.trim();
  }
  return data;
};

const QrScanner = ({ open, onClose, onScan }: QrScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerId = "qr-reader";

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setError(null);

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (!mounted) return;
            const address = extractAddress(decodedText);
            onScan(address);
            scanner.stop().catch(() => {});
            onClose();
          },
          () => {} // ignore scan failures
        );
      } catch (err: any) {
        if (mounted) {
          setError(err?.message?.includes("NotAllowed")
            ? "Camera access denied. Please allow camera permissions."
            : "Could not start camera. Try again or paste the address manually.");
        }
      }
    };

    // Small delay to ensure DOM element exists
    const timeout = setTimeout(startScanner, 300);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onScan, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
        >
          <div className="flex items-center justify-between px-4 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Camera size={20} className="text-primary" />
              <h2 className="text-lg font-display font-bold text-foreground">Scan QR Code</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-4">
            {error ? (
              <div className="text-center space-y-3">
                <AlertCircle size={48} className="text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-card text-foreground text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden border-2 border-primary/30">
                  <div id={containerId} className="w-full h-full" />
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Point your camera at a wallet QR code
                </p>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QrScanner;
