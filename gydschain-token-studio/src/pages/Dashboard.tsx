import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, ExternalLink, Flame, Coins, Pause, Play, Send, Radio, Wallet, Shield, Edit3, ShieldOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TransferDialog } from "@/components/TransferDialog";
import type { DeployedToken, Transaction } from "@/lib/blockchain/types";
import { getExplorerUrl } from "@/lib/blockchain/config";
import { useGydsWebSocket } from "@/hooks/useGydsWebSocket";
import { AUTHORITY_LABELS, type AuthorityType } from "@/lib/blockchain/gplAuthority";
import { Link } from "react-router-dom";

interface DashboardPageProps {
  tokens: DeployedToken[];
  transactions: Transaction[];
  isWalletConnected: boolean;
  walletAddress?: string | null;
  walletBalance?: string;
  onTransferTokens?: (tokenAddress: string, to: string, amount: string) => Promise<string>;
  onConnectWallet?: () => void;
}

const DashboardPage = ({
  tokens,
  transactions,
  isWalletConnected,
  walletAddress,
  walletBalance = "0",
  onTransferTokens,
  onConnectWallet,
}: DashboardPageProps) => {
  const [transferToken, setTransferToken] = useState<DeployedToken | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [pendingHashes, setPendingHashes] = useState<string[]>([]);

  // Authority management
  const [authorityDialog, setAuthorityDialog] = useState<{ token: DeployedToken; action: "revoke" | "transfer" | "update-metadata" } | null>(null);
  const [selectedAuthority, setSelectedAuthority] = useState<AuthorityType | "">("");
  const [newAuthorityAddress, setNewAuthorityAddress] = useState("");
  const [metadataName, setMetadataName] = useState("");
  const [metadataSymbol, setMetadataSymbol] = useState("");

  const { latestBlock, confirmedTxs, isConnected: rpcConnected, watchTransaction } = useGydsWebSocket({
    watchAddress: walletAddress,
    pendingTxHashes: pendingHashes,
    pollInterval: 10_000,
  });

  useEffect(() => {
    if (confirmedTxs.length > 0) {
      setPendingHashes((prev) =>
        prev.filter((h) => !confirmedTxs.some((c) => c.hash === h))
      );
    }
  }, [confirmedTxs]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const handleTransferClick = (token: DeployedToken) => {
    if (!isWalletConnected) { toast.error("Connect your wallet first"); onConnectWallet?.(); return; }
    if (Number(walletBalance) <= 0) { toast.error("Insufficient GYDS balance for gas fees"); return; }
    setTransferToken(token);
    setTransferOpen(true);
  };

  const handleTransfer = async (tokenAddress: string, to: string, amount: string) => {
    if (!isWalletConnected) throw new Error("Wallet not connected");
    if (Number(walletBalance) <= 0) throw new Error("Insufficient GYDS for gas fees");
    if (onTransferTokens) {
      const txHash = await onTransferTokens(tokenAddress, to, amount);
      setPendingHashes((prev) => [...prev, txHash]);
      watchTransaction(txHash);
      return txHash;
    }
    throw new Error("Transfer not available");
  };

  const handleAuthorityAction = async () => {
    if (!selectedAuthority && authorityDialog?.action !== "update-metadata") {
      toast.error("Select an authority type");
      return;
    }
    toast.info("Please confirm the transaction in your wallet...");
    // Simulate transaction — real implementation uses gplAuthority functions
    await new Promise((r) => setTimeout(r, 2000));
    toast.success(`Authority action completed!`);
    setAuthorityDialog(null);
    setSelectedAuthority("");
    setNewAuthorityAddress("");
  };

  // Show all tokens (user's created tokens + tokens they may hold)
  const myTokens = tokens;

  if (!isWalletConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">
            Connect your wallet with sufficient GYDS balance to manage tokens and process transactions.
          </p>
          <Button onClick={onConnectWallet} className="btn-gradient">
            <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold mb-2">
                Token <span className="gradient-text">Dashboard</span>
              </h1>
              <p className="text-muted-foreground">Manage your deployed tokens</p>
            </div>
            <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
              <Radio className={`w-3.5 h-3.5 ${rpcConnected ? "text-[hsl(var(--success))] animate-pulse" : "text-muted-foreground"}`} />
              <span className="text-muted-foreground">Block:</span>
              <span className="font-mono font-medium text-foreground">
                {latestBlock ? parseInt(latestBlock.blockNumber, 16).toLocaleString() : "—"}
              </span>
            </div>
          </div>

          {/* Wallet Info Bar */}
          <div className="glass-card p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="font-mono text-sm text-muted-foreground">{walletAddress || "—"}</span>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Balance: </span>
              <span className="font-heading font-bold gradient-text">{walletBalance} GYDS</span>
            </div>
          </div>

          {/* Token Cards */}
          {myTokens.length === 0 ? (
            <div className="glass-card p-10 text-center mb-12">
              <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-heading font-bold mb-2">No Tokens Yet</h3>
              <p className="text-muted-foreground mb-6">Create your first GPL token on GydsChain</p>
              <Link to="/create">
                <Button className="btn-gradient">Create Token</Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6 mb-12">
              {myTokens.map((token) => (
                <div key={token.contractAddress} className="glass-card p-6 glow-effect">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {token.logoUrl && (
                        <img src={token.logoUrl} alt={token.symbol} className="w-10 h-10 rounded-full ring-2 ring-primary/20" />
                      )}
                      <div>
                        <h3 className="font-heading font-bold text-xl">{token.name}</h3>
                        <p className="text-primary font-mono text-sm">{token.symbol}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${token.isPaused ? "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]" : "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"}`}>
                      {token.isPaused ? "Paused" : "Active"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs">Supply</span>
                      <p className="font-medium">{Number(token.currentSupply).toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs">Decimals</span>
                      <p className="font-medium">{token.decimals}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs">Creator</span>
                      <p className="font-medium text-xs font-mono truncate">{token.creator}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 mb-4">
                    <span className="font-mono text-xs text-muted-foreground">{token.contractAddress}</span>
                    <div className="flex gap-1">
                      <button onClick={() => copyToClipboard(token.contractAddress)} className="p-1 rounded hover:bg-muted/50">
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <a href={getExplorerUrl("token", token.contractAddress)} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted/50">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    </div>
                  </div>

                  {/* GPL Authority Summary */}
                  {token.gplConfig && (
                    <div className="bg-muted/20 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">GPL Authorities</span>
                        {token.gplConfig.multisig && (
                          <span className="ml-auto text-[0.6rem] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            🔐 {token.gplConfig.multisig.threshold}/{token.gplConfig.multisig.signers.length} Multisig
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {token.gplConfig.authorities.filter(a => a.type !== "program" && a.type !== "owner").map((auth) => (
                          <div key={auth.type} className="flex items-center gap-1.5 text-[0.65rem]">
                            <span>{AUTHORITY_LABELS[auth.type].icon}</span>
                            <span className="truncate">{AUTHORITY_LABELS[auth.type].label.replace(" Authority", "")}</span>
                            {auth.isRevoked ? (
                              <span className="text-destructive ml-auto">🚫</span>
                            ) : (
                              <span className="text-[hsl(var(--success))] ml-auto">✅</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="border-border/50 text-xs gap-1.5">
                      <Coins className="w-3.5 h-3.5" /> Mint
                    </Button>
                    <Button size="sm" variant="outline" className="border-border/50 text-xs gap-1.5">
                      <Flame className="w-3.5 h-3.5" /> Burn
                    </Button>
                    <Button size="sm" variant="outline" className="border-border/50 text-xs gap-1.5">
                      {token.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      {token.isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button size="sm" variant="outline" className="border-border/50 text-xs gap-1.5" onClick={() => handleTransferClick(token)}>
                      <Send className="w-3.5 h-3.5" /> Transfer
                    </Button>
                    <Button size="sm" variant="outline" className="border-border/50 text-xs gap-1.5" onClick={() => { setAuthorityDialog({ token, action: "revoke" }); setSelectedAuthority(""); }}>
                      <ShieldOff className="w-3.5 h-3.5" /> Revoke
                    </Button>
                    <Button size="sm" variant="outline" className="border-border/50 text-xs gap-1.5" onClick={() => { setAuthorityDialog({ token, action: "transfer" }); setSelectedAuthority(""); setNewAuthorityAddress(""); }}>
                      <RefreshCw className="w-3.5 h-3.5" /> Transfer Auth
                    </Button>
                    <Button size="sm" variant="outline" className="border-border/50 text-xs gap-1.5" onClick={() => { setAuthorityDialog({ token, action: "update-metadata" }); setMetadataName(token.name); setMetadataSymbol(token.symbol); }}>
                      <Edit3 className="w-3.5 h-3.5" /> Edit Metadata
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Transactions */}
          <h2 className="text-2xl font-heading font-bold mb-4">Recent Transactions</h2>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-4 text-muted-foreground font-medium">Type</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Token</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Hash</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No transactions yet</td></tr>
                ) : transactions.map((tx) => {
                  const wsConfirmed = confirmedTxs.find((c) => c.hash === tx.hash);
                  const displayStatus = wsConfirmed ? wsConfirmed.status : tx.status;
                  return (
                    <tr key={tx.hash} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="p-4 capitalize">{tx.type}</td>
                      <td className="p-4 font-mono text-primary">{tx.tokenSymbol}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                        <a href={getExplorerUrl("tx", tx.hash)} target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center gap-1">
                          {tx.hash} <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${displayStatus === "success" || displayStatus === "confirmed" ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" : displayStatus === "pending" ? "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]" : "bg-destructive/20 text-destructive"}`}>
                          {displayStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        token={transferToken}
        onTransfer={handleTransfer}
      />

      {/* Authority Management Dialog */}
      <Dialog open={!!authorityDialog} onOpenChange={(open) => !open && setAuthorityDialog(null)}>
        <DialogContent className="glass-card-strong border-border/50">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {authorityDialog?.action === "revoke" && "Revoke Authority"}
              {authorityDialog?.action === "transfer" && "Transfer Authority"}
              {authorityDialog?.action === "update-metadata" && "Update Token Metadata"}
            </DialogTitle>
            <DialogDescription>
              {authorityDialog?.action === "revoke" && "Permanently revoke an authority. This cannot be undone."}
              {authorityDialog?.action === "transfer" && "Transfer an authority to a new address."}
              {authorityDialog?.action === "update-metadata" && "Update token name, symbol, or other metadata. Requires Update Authority."}
            </DialogDescription>
          </DialogHeader>

          {authorityDialog?.action === "update-metadata" ? (
            <div className="space-y-4 pt-2">
              <div>
                <Label>Token Name</Label>
                <Input value={metadataName} onChange={(e) => setMetadataName(e.target.value)} className="mt-1.5 bg-muted/50 border-border/50" />
              </div>
              <div>
                <Label>Token Symbol</Label>
                <Input value={metadataSymbol} onChange={(e) => setMetadataSymbol(e.target.value.toUpperCase())} className="mt-1.5 bg-muted/50 border-border/50" />
              </div>
              <Button onClick={handleAuthorityAction} className="w-full btn-gradient">
                Confirm Update (requires wallet signature)
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <Label>Authority Type</Label>
                <Select value={selectedAuthority} onValueChange={(v) => setSelectedAuthority(v as AuthorityType)}>
                  <SelectTrigger className="mt-1.5 bg-muted/50 border-border/50">
                    <SelectValue placeholder="Select authority" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorityDialog?.token.gplConfig?.authorities
                      .filter((a) => a.type !== "program" && a.type !== "owner" && !a.isRevoked)
                      .map((a) => (
                        <SelectItem key={a.type} value={a.type}>
                          {AUTHORITY_LABELS[a.type].icon} {AUTHORITY_LABELS[a.type].label}
                        </SelectItem>
                      )) || []}
                  </SelectContent>
                </Select>
              </div>
              {authorityDialog?.action === "transfer" && (
                <div>
                  <Label>New Authority Address</Label>
                  <Input
                    value={newAuthorityAddress}
                    onChange={(e) => setNewAuthorityAddress(e.target.value)}
                    placeholder="0x..."
                    className="mt-1.5 bg-muted/50 border-border/50 font-mono text-sm"
                  />
                </div>
              )}
              {authorityDialog?.action === "revoke" && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                  ⚠️ This action is permanent and cannot be reversed. Cost: 0.1 GYDS.
                </div>
              )}
              <Button
                onClick={handleAuthorityAction}
                className={`w-full ${authorityDialog?.action === "revoke" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "btn-gradient"}`}
                disabled={!selectedAuthority || (authorityDialog?.action === "transfer" && !newAuthorityAddress)}
              >
                {authorityDialog?.action === "revoke" ? "Revoke Authority (requires wallet signature)" : "Transfer Authority (requires wallet signature)"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
