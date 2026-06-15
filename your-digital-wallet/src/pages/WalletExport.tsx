import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Key, FileText, Eye, EyeOff, Copy, Check, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { exportPrivateKey, exportMnemonic, deleteWallet, getWalletAddress } from "@/lib/wallet-core";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/wallet/BottomNav";

const WalletExport = () => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const address = getWalletAddress();

  const handleExportKey = async () => {
    setLoading(true);
    try {
      const key = await exportPrivateKey(password);
      setPrivateKey(key);
    } catch {
      toast({ title: "Wrong password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportMnemonic = async () => {
    setLoading(true);
    try {
      const phrase = await exportMnemonic(password);
      setMnemonic(phrase);
      if (!phrase) toast({ title: "No mnemonic available", description: "Wallet was imported via private key", variant: "destructive" });
    } catch {
      toast({ title: "Wrong password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = () => {
    deleteWallet();
    toast({ title: "Wallet deleted" });
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Link to="/settings" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </Link>

        <h1 className="text-xl font-display font-bold text-foreground mb-2">Wallet Management</h1>
        <p className="text-sm text-muted-foreground mb-6">Export or manage your wallet</p>

        {/* Address */}
        {address && (
          <div className="bg-card rounded-2xl p-4 mb-6">
            <span className="text-xs text-muted-foreground">Wallet Address</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm font-mono text-foreground truncate flex-1">{address}</p>
              <button onClick={() => handleCopy(address, "address")} className="text-muted-foreground hover:text-primary transition-colors">
                {copied === "address" ? <Check size={16} className="text-[hsl(var(--success))]" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Password input */}
        {!privateKey && !mnemonic && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <label className="text-sm text-muted-foreground mb-2 block">Enter wallet password to export</label>
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your wallet password"
                className="w-full bg-card rounded-xl p-4 pr-12 text-foreground outline-none placeholder:text-muted-foreground/40 border border-border focus:border-primary transition-colors"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExportMnemonic}
                disabled={loading || !password}
                className="w-full flex items-center gap-3 bg-card rounded-xl p-4 hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText size={18} className="text-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-foreground">Export Recovery Phrase</p>
                  <p className="text-xs text-muted-foreground">12-word mnemonic backup</p>
                </div>
                {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
              </button>

              <button
                onClick={handleExportKey}
                disabled={loading || !password}
                className="w-full flex items-center gap-3 bg-card rounded-xl p-4 hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Key size={18} className="text-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-foreground">Export Private Key</p>
                  <p className="text-xs text-muted-foreground">Raw hex key</p>
                </div>
                {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
              </button>
            </div>
          </motion.div>
        )}

        {/* Show mnemonic */}
        {mnemonic && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-[hsl(45,93%,58%)]" />
              <span className="text-sm font-semibold text-foreground">Recovery Phrase</span>
            </div>
            <div className="bg-card rounded-2xl p-4 mb-3">
              <div className="grid grid-cols-3 gap-2">
                {mnemonic.split(" ").map((word, i) => (
                  <div key={i} className="bg-secondary rounded-lg px-2 py-1.5 text-center">
                    <span className="text-xs text-muted-foreground">{i + 1}. </span>
                    <span className="text-xs font-medium text-foreground">{word}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => handleCopy(mnemonic, "mnemonic")} className="w-full flex items-center justify-center gap-2 bg-card rounded-xl py-3 text-sm hover:bg-secondary/50 transition-colors">
              {copied === "mnemonic" ? <Check size={14} className="text-[hsl(var(--success))]" /> : <Copy size={14} />}
              {copied === "mnemonic" ? "Copied!" : "Copy phrase"}
            </button>
          </motion.div>
        )}

        {/* Show private key */}
        {privateKey && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-[hsl(45,93%,58%)]" />
              <span className="text-sm font-semibold text-foreground">Private Key</span>
            </div>
            <div className="bg-card rounded-2xl p-4 mb-3">
              <p className="text-xs font-mono text-foreground break-all">{privateKey}</p>
            </div>
            <button onClick={() => handleCopy(privateKey, "key")} className="w-full flex items-center justify-center gap-2 bg-card rounded-xl py-3 text-sm hover:bg-secondary/50 transition-colors">
              {copied === "key" ? <Check size={14} className="text-[hsl(var(--success))]" /> : <Copy size={14} />}
              {copied === "key" ? "Copied!" : "Copy private key"}
            </button>
          </motion.div>
        )}

        {/* Delete wallet */}
        <div className="mt-8 border-t border-border pt-6">
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-center gap-2 text-destructive hover:text-destructive/80 transition-colors py-3">
              <Trash2 size={18} />
              <span className="font-semibold">Delete Wallet</span>
            </button>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-destructive/10 rounded-xl p-4 text-center">
              <p className="text-sm text-foreground font-semibold mb-1">Are you sure?</p>
              <p className="text-xs text-muted-foreground mb-4">This will permanently delete your wallet from this device. Make sure you've backed up your recovery phrase.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-card text-foreground rounded-xl py-3 text-sm font-semibold">Cancel</button>
                <button onClick={handleDelete} className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-3 text-sm font-semibold">Delete</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default WalletExport;
