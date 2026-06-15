import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ChevronRight, Loader2, Plus, Key, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const WALLETS: WalletOption[] = [
  { id: "phantom", name: "Phantom", icon: "👻", description: "Popular multi-chain wallet" },
  { id: "solflare", name: "Solflare", icon: "🔥", description: "GydsChain native wallet" },
  { id: "backpack", name: "Backpack", icon: "🎒", description: "Next-gen crypto wallet" },
  { id: "gyds-wallet", name: "GYDS Wallet", icon: "⚡", description: "Official GydsChain wallet" },
];

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (walletType: string) => void;
  onImportWallet?: (privateKey: string) => void;
  onCreateWallet?: () => void;
  isConnecting: boolean;
  connectingWallet: string | null;
}

export const WalletModal = ({ open, onOpenChange, onConnect, onImportWallet, onCreateWallet, isConnecting, connectingWallet }: WalletModalProps) => {
  const [activeTab, setActiveTab] = useState<string>("connect");
  const [importKey, setImportKey] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleImport = () => {
    if (!importKey.trim()) {
      toast.error("Please enter a private key");
      return;
    }
    if (!importKey.startsWith("0x") || importKey.length < 66) {
      toast.error("Invalid private key format. Must start with 0x and be 66 characters.");
      return;
    }
    onImportWallet?.(importKey);
    setImportKey("");
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      onCreateWallet?.();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-strong border-border/50 max-w-md p-0 overflow-hidden">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Wallet
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Connect, import, or create a wallet for GydsChain
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full bg-muted/30 h-9">
            <TabsTrigger value="connect" className="flex-1 text-xs">Connect</TabsTrigger>
            <TabsTrigger value="import" className="flex-1 text-xs">Import</TabsTrigger>
            <TabsTrigger value="create" className="flex-1 text-xs">Create New</TabsTrigger>
          </TabsList>

          {/* Connect existing wallet */}
          <TabsContent value="connect" className="mt-3 space-y-2 pb-2">
            {WALLETS.map((wallet, i) => (
              <motion.button
                key={wallet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => onConnect(wallet.id)}
                disabled={isConnecting}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 group disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {wallet.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{wallet.name}</p>
                  <p className="text-xs text-muted-foreground">{wallet.description}</p>
                </div>
                {isConnecting && connectingWallet === wallet.id ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </motion.button>
            ))}
          </TabsContent>

          {/* Import wallet */}
          <TabsContent value="import" className="mt-3 space-y-4 pb-2">
            <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 rounded-lg p-3 text-xs text-[hsl(var(--warning))] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Security Warning</p>
                <p className="mt-0.5">Never share your private key with anyone. Only import on devices you trust. Your key is processed locally and never sent to any server.</p>
              </div>
            </div>
            <div>
              <Label className="text-sm">Private Key</Label>
              <Input
                type="password"
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
                placeholder="0x..."
                className="mt-1.5 bg-muted/50 border-border/50 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Enter your 64-character hex private key (with 0x prefix)</p>
            </div>
            <Button
              onClick={handleImport}
              disabled={!importKey.trim() || isConnecting}
              className="w-full btn-gradient gap-2"
            >
              <Key className="w-4 h-4" />
              {isConnecting ? "Importing..." : "Import Wallet"}
            </Button>
          </TabsContent>

          {/* Create new wallet */}
          <TabsContent value="create" className="mt-3 space-y-4 pb-2">
            <div className="bg-muted/30 rounded-xl p-5 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-heading font-semibold">Create New Wallet</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate a brand new GydsChain wallet. You'll receive a private key and address.
                <strong className="text-foreground block mt-1">Save your private key securely — it cannot be recovered!</strong>
              </p>
            </div>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full btn-gradient gap-2"
            >
              {isCreating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Plus className="w-4 h-4" /> Generate New Wallet</>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="px-6 pb-5 pt-2">
          <p className="text-xs text-muted-foreground text-center">
            By connecting, you agree to the Terms of Service. We never store your private keys.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
