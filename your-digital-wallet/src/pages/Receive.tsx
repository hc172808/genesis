import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import BottomNav from "@/components/wallet/BottomNav";
import { getWalletAddress } from "@/lib/wallet-core";
import { getNetworkConfig } from "@/lib/network-config";
import { useToast } from "@/hooks/use-toast";

const Receive = () => {
  const [copied, setCopied] = useState(false);
  const walletAddress = getWalletAddress() || "";
  const config = getNetworkConfig();
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My GYDS Wallet Address",
          text: walletAddress,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
      toast({ title: "Address copied!" });
    }
  };

  // EIP-681 format for better wallet compatibility
  const qrValue = walletAddress ? `ethereum:${walletAddress}@${config.chainId}` : "";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-display font-bold text-foreground">Receive Crypto</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              {walletAddress ? (
                <QRCodeSVG
                  value={qrValue}
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No wallet found
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Scan this QR code to send tokens to your wallet
          </p>

          {/* Address */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Your Wallet Address</label>
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <p className="flex-1 text-sm text-foreground font-mono break-all">{walletAddress}</p>
              <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                {copied ? <Check size={20} className="text-[hsl(var(--success))]" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 bg-card rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              {copied ? <Check size={16} className="text-[hsl(var(--success))]" /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Address"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 gradient-primary rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Send <span className="text-primary font-semibold">GYDS</span>, <span className="text-primary font-semibold">GYD</span>, or any ERC-20 token on {config.name} to this address.
          </p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Receive;
