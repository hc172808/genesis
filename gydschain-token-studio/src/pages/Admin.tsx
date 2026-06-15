import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Coins, Activity, Settings, BarChart3, AlertTriangle, Globe, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { DeployedToken, Transaction } from "@/lib/blockchain/types";
import AdminHostingTab from "@/components/admin/AdminHostingTab";
import AdminDexTab from "@/components/admin/AdminDexTab";
import { isAdminWallet } from "@/lib/admin";

interface AdminPageProps {
  tokens: DeployedToken[];
  transactions: Transaction[];
  wallet: { address: string | null; isConnected: boolean; balance: string };
  onConnectWallet: () => void;
}

const AdminPage = ({ tokens, transactions, wallet, onConnectWallet }: AdminPageProps) => {
  const [feeWallet, setFeeWallet] = useState("0x0000000000000000000000000000000000000FEE");
  const [tokenCreationFee, setTokenCreationFee] = useState("0.5");
  const [flaggedTokens, setFlaggedTokens] = useState<Set<string>>(new Set());

  const isAdmin = wallet.isConnected && isAdminWallet(wallet.address);

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center max-w-md">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Admin Access</h2>
          <p className="text-muted-foreground mb-6">Connect an authorized admin wallet to access the admin dashboard.</p>
          <Button onClick={onConnectWallet} className="btn-gradient">
            <Shield className="w-4 h-4 mr-2" /> Connect Admin Wallet
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Unauthorized</h2>
          <p className="text-muted-foreground mb-4">
            Wallet <span className="font-mono text-sm text-foreground">{wallet.address}</span> is not authorized as an admin.
          </p>
          <p className="text-xs text-muted-foreground">Contact the platform owner to request admin access.</p>
        </motion.div>
      </div>
    );
  }

  const totalTokens = tokens.length;
  const uniqueCreators = new Set(tokens.map((t) => t.creator)).size;
  const totalTxs = transactions.length;
  const successfulTxs = transactions.filter((t) => t.status === "success").length;

  const toggleFlag = (addr: string) => {
    setFlaggedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(addr)) next.delete(addr);
      else next.add(addr);
      return next;
    });
    toast.success("Token flag updated");
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold">
                Admin <span className="gradient-text">Dashboard</span>
              </h1>
              <p className="text-muted-foreground text-sm">Platform management & analytics</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Coins, label: "Total Tokens", value: totalTokens, color: "text-primary" },
              { icon: Users, label: "Unique Creators", value: uniqueCreators, color: "text-[hsl(var(--success))]" },
              { icon: Activity, label: "Total Transactions", value: totalTxs, color: "text-[hsl(var(--warning))]" },
              { icon: BarChart3, label: "Success Rate", value: `${totalTxs > 0 ? Math.round((successfulTxs / totalTxs) * 100) : 0}%`, color: "text-primary" },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-5">
                <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-heading font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="tokens" className="space-y-6">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="hosting">
                <Globe className="w-4 h-4 mr-1" /> Hosting
              </TabsTrigger>
              <TabsTrigger value="dex">
                <Droplets className="w-4 h-4 mr-1" /> DEX
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="tokens">
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left p-4 text-muted-foreground font-medium">Token</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Creator</th>
                      <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Supply</th>
                      <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Created</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <tr key={token.contractAddress} className={`border-b border-border/20 hover:bg-muted/20 ${flaggedTokens.has(token.contractAddress) ? "bg-destructive/5" : ""}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {token.logoUrl && <img src={token.logoUrl} alt="" className="w-6 h-6 rounded-full" />}
                            <div>
                              <p className="font-medium">{token.name}</p>
                              <p className="text-xs text-primary font-mono">{token.symbol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-muted-foreground">{token.creator}</td>
                        <td className="p-4 hidden md:table-cell">{Number(token.totalSupply).toLocaleString()}</td>
                        <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">
                          {new Date(token.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant={flaggedTokens.has(token.contractAddress) ? "destructive" : "outline"}
                            className="text-xs"
                            onClick={() => toggleFlag(token.contractAddress)}
                          >
                            {flaggedTokens.has(token.contractAddress) ? "Unflag" : "Flag"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {tokens.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No tokens deployed yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="transactions">
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left p-4 text-muted-foreground font-medium">Type</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Token</th>
                      <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Hash</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 50).map((tx) => (
                      <tr key={tx.hash} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="p-4 capitalize">{tx.type}</td>
                        <td className="p-4 font-mono text-primary">{tx.tokenSymbol}</td>
                        <td className="p-4 font-mono text-xs text-muted-foreground hidden md:table-cell">{tx.hash}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${tx.status === "success" ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" : tx.status === "pending" ? "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]" : "bg-destructive/20 text-destructive"}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="hosting">
              <AdminHostingTab wallet={wallet} />
            </TabsContent>

            <TabsContent value="settings">
              <div className="glass-card p-6 space-y-6 max-w-lg">
                <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" /> Platform Settings
                </h3>
                <div>
                  <Label>Fee Collection Wallet</Label>
                  <Input
                    value={feeWallet}
                    onChange={(e) => setFeeWallet(e.target.value)}
                    className="mt-1.5 bg-muted/50 border-border/50 font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Token Creation Fee (GYDS)</Label>
                  <Input
                    value={tokenCreationFee}
                    onChange={(e) => setTokenCreationFee(e.target.value)}
                    className="mt-1.5 bg-muted/50 border-border/50 w-32"
                    type="number"
                    step="0.1"
                  />
                </div>
                <Button className="btn-gradient" onClick={() => toast.success("Settings saved (requires on-chain tx)")}>
                  Save Settings
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPage;
