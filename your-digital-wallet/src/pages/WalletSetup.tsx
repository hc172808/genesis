import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Download, Shield, Eye, EyeOff, Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { createWallet, importFromMnemonic, importFromPrivateKey, hasWallet } from "@/lib/wallet-core";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type Step = "choose" | "create-password" | "show-mnemonic" | "import-choose" | "import-mnemonic" | "import-key" | "import-password";

const WalletSetup = () => {
  const [step, setStep] = useState<Step>("choose");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [importType, setImportType] = useState<"mnemonic" | "key">("mnemonic");
  const [showPassword, setShowPassword] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await createWallet(password);
      setMnemonic(result.mnemonic);
      setStep("show-mnemonic");
    } catch (err: any) {
      toast({ title: "Failed to create wallet", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (importType === "mnemonic") {
        await importFromMnemonic(mnemonicInput, password);
      } else {
        await importFromPrivateKey(privateKeyInput, password);
      }
      toast({ title: "Wallet imported successfully!" });
      navigate("/");
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const finishSetup = () => {
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === "choose" && (
            <motion.div key="choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                <Shield size={36} className="text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">GYDS Wallet</h1>
              <p className="text-muted-foreground mb-8">Create or import your wallet to get started</p>

              <div className="space-y-3">
                <button
                  onClick={() => setStep("create-password")}
                  className="w-full gradient-primary text-primary-foreground font-semibold py-4 rounded-xl glow-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-lg"
                >
                  <Plus size={20} />
                  Create New Wallet
                </button>
                <button
                  onClick={() => setStep("import-choose")}
                  className="w-full bg-card text-foreground font-semibold py-4 rounded-xl hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <Download size={20} />
                  Import Existing Wallet
                </button>
              </div>
            </motion.div>
          )}

          {step === "create-password" && (
            <motion.div key="create-pw" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="text-xl font-display font-bold text-foreground mb-2">Set a Password</h1>
              <p className="text-sm text-muted-foreground mb-6">This encrypts your wallet locally. You'll need it to sign transactions.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full bg-card rounded-xl p-4 pr-12 text-foreground outline-none placeholder:text-muted-foreground/40 border border-border focus:border-primary transition-colors"
                    />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-card rounded-xl p-4 text-foreground outline-none placeholder:text-muted-foreground/40 border border-border focus:border-primary transition-colors"
                  />
                </div>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full gradient-primary text-primary-foreground font-semibold py-4 rounded-xl glow-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Create Wallet"}
                </button>
                <button onClick={() => setStep("choose")} className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors py-2">
                  Back
                </button>
              </div>
            </motion.div>
          )}

          {step === "show-mnemonic" && (
            <motion.div key="mnemonic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={20} className="text-[hsl(45,93%,58%)]" />
                <h1 className="text-xl font-display font-bold text-foreground">Recovery Phrase</h1>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Write down these 12 words in order. This is the ONLY way to recover your wallet. Never share it.</p>

              <div className="bg-card rounded-2xl p-4 mb-4 relative">
                {!showMnemonic && (
                  <button
                    onClick={() => setShowMnemonic(true)}
                    className="absolute inset-0 bg-card/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 z-10"
                  >
                    <Eye size={24} className="text-primary" />
                    <span className="text-sm font-medium text-foreground">Tap to reveal</span>
                  </button>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {mnemonic.split(" ").map((word, i) => (
                    <div key={i} className="bg-secondary rounded-lg px-3 py-2 text-center">
                      <span className="text-xs text-muted-foreground mr-1">{i + 1}.</span>
                      <span className="text-sm font-medium text-foreground">{word}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={copyMnemonic}
                className="w-full flex items-center justify-center gap-2 bg-card text-foreground rounded-xl py-3 mb-3 text-sm font-medium hover:bg-secondary/50 transition-colors"
              >
                {copied ? <Check size={16} className="text-[hsl(var(--success))]" /> : <Copy size={16} />}
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>

              <button
                onClick={finishSetup}
                className="w-full gradient-primary text-primary-foreground font-semibold py-4 rounded-xl glow-primary hover:opacity-90 transition-opacity"
              >
                I've Saved It — Continue
              </button>
            </motion.div>
          )}

          {step === "import-choose" && (
            <motion.div key="import-choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="text-xl font-display font-bold text-foreground mb-2">Import Wallet</h1>
              <p className="text-sm text-muted-foreground mb-6">Choose how to import your existing wallet</p>

              <div className="space-y-3">
                <button
                  onClick={() => { setImportType("mnemonic"); setStep("import-mnemonic"); }}
                  className="w-full bg-card text-foreground font-semibold py-4 rounded-xl hover:bg-secondary/50 transition-colors text-left px-5"
                >
                  <p className="font-semibold">Recovery Phrase</p>
                  <p className="text-xs text-muted-foreground mt-1">12 or 24 word mnemonic</p>
                </button>
                <button
                  onClick={() => { setImportType("key"); setStep("import-key"); }}
                  className="w-full bg-card text-foreground font-semibold py-4 rounded-xl hover:bg-secondary/50 transition-colors text-left px-5"
                >
                  <p className="font-semibold">Private Key</p>
                  <p className="text-xs text-muted-foreground mt-1">Hex string starting with 0x</p>
                </button>
              </div>
              <button onClick={() => setStep("choose")} className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors py-3 mt-3">
                Back
              </button>
            </motion.div>
          )}

          {step === "import-mnemonic" && (
            <motion.div key="import-mn" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="text-xl font-display font-bold text-foreground mb-2">Enter Recovery Phrase</h1>
              <p className="text-sm text-muted-foreground mb-4">Enter your 12 or 24 word recovery phrase separated by spaces</p>
              <textarea
                value={mnemonicInput}
                onChange={(e) => setMnemonicInput(e.target.value)}
                placeholder="word1 word2 word3 ..."
                rows={4}
                className="w-full bg-card rounded-xl p-4 text-foreground outline-none placeholder:text-muted-foreground/40 border border-border focus:border-primary transition-colors resize-none mb-4"
              />
              <button
                onClick={() => setStep("import-password")}
                disabled={mnemonicInput.trim().split(/\s+/).length < 12}
                className="w-full gradient-primary text-primary-foreground font-semibold py-4 rounded-xl glow-primary hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                Continue
              </button>
              <button onClick={() => setStep("import-choose")} className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors py-3 mt-2">
                Back
              </button>
            </motion.div>
          )}

          {step === "import-key" && (
            <motion.div key="import-pk" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="text-xl font-display font-bold text-foreground mb-2">Enter Private Key</h1>
              <p className="text-sm text-muted-foreground mb-4">Paste your private key (hex string)</p>
              <input
                type="password"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                placeholder="0x..."
                className="w-full bg-card rounded-xl p-4 text-foreground outline-none placeholder:text-muted-foreground/40 border border-border focus:border-primary transition-colors mb-4"
              />
              <button
                onClick={() => setStep("import-password")}
                disabled={privateKeyInput.length < 64}
                className="w-full gradient-primary text-primary-foreground font-semibold py-4 rounded-xl glow-primary hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                Continue
              </button>
              <button onClick={() => setStep("import-choose")} className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors py-3 mt-2">
                Back
              </button>
            </motion.div>
          )}

          {step === "import-password" && (
            <motion.div key="import-pw" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="text-xl font-display font-bold text-foreground mb-2">Set Password</h1>
              <p className="text-sm text-muted-foreground mb-6">Encrypt your imported wallet with a password</p>
              <div className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-card rounded-xl p-4 text-foreground outline-none placeholder:text-muted-foreground/40 border border-border focus:border-primary transition-colors"
                />
                <button
                  onClick={handleImport}
                  disabled={loading || password.length < 8}
                  className="w-full gradient-primary text-primary-foreground font-semibold py-4 rounded-xl glow-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Import Wallet"}
                </button>
                <button onClick={() => setStep("import-choose")} className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors py-2">
                  Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WalletSetup;
