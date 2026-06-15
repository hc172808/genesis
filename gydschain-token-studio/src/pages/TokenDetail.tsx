import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Copy, Coins, Users, Clock, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getExplorerUrl } from "@/lib/blockchain/config";
import { getTokenInfo, getTokenBalance, getRecentTransactions } from "@/lib/blockchain/indexer";
import type { DeployedToken, Transaction } from "@/lib/blockchain/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

interface TokenDetailPageProps {
  tokens: DeployedToken[];
  transactions: Transaction[];
}

// Mock price data for chart
const generatePriceData = (symbol: string) => {
  const data = [];
  let price = symbol === "GGOLD" ? 0.0042 : 0.0018;
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price = price * (1 + (Math.random() - 0.48) * 0.1);
    data.push({
      date: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      price: Number(price.toFixed(6)),
      volume: Math.floor(Math.random() * 50000 + 10000),
    });
  }
  return data;
};

// Mock holders
const MOCK_HOLDERS = [
  { address: "0x7a3B...9f4E", balance: "450,000,000", percentage: 45 },
  { address: "0xDe4F...1a2B", balance: "200,000,000", percentage: 20 },
  { address: "0x9cE2...3d4F", balance: "150,000,000", percentage: 15 },
  { address: "0xBb5A...6e7G", balance: "100,000,000", percentage: 10 },
  { address: "0x1fC8...8h9I", balance: "50,000,000", percentage: 5 },
  { address: "0xAa2D...0j1K", balance: "50,000,000", percentage: 5 },
];

const TokenDetailPage = ({ tokens, transactions }: TokenDetailPageProps) => {
  const { address } = useParams<{ address: string }>();
  const [onChainInfo, setOnChainInfo] = useState<{
    name: string; symbol: string; decimals: number; totalSupply: string;
  } | null>(null);
  const [recentTxs, setRecentTxs] = useState<Array<{
    hash: string; contractAddress: string; blockNumber: number;
  }>>([]);

  const token = tokens.find((t) => t.contractAddress === address);
  const tokenTxs = transactions.filter((t) => token && t.tokenSymbol === token.symbol);
  const priceData = token ? generatePriceData(token.symbol) : [];
  const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : 0;
  const priceChange = priceData.length > 1
    ? ((priceData[priceData.length - 1].price - priceData[0].price) / priceData[0].price * 100)
    : 0;

  // Fetch on-chain data
  useEffect(() => {
    if (!address) return;
    getTokenInfo(address).then((info) => {
      if (info) setOnChainInfo(info);
    });
    getRecentTransactions(address, 50).then(setRecentTxs);
  }, [address]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied!");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">Token Not Found</h2>
          <p className="text-muted-foreground mb-6">The token at address {address} was not found.</p>
          <Link to="/gallery">
            <Button className="btn-gradient">Back to Gallery</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Back link */}
          <Link to="/gallery" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Gallery
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Coins className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
                {token.name}
                <span className="text-lg text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-lg">
                  {token.symbol}
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground font-mono">{address}</span>
                <button onClick={copyAddress} className="text-muted-foreground hover:text-primary transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={getExplorerUrl("token", address!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{currentPrice.toFixed(6)} GYDS</div>
              <div className={`text-sm font-medium ${priceChange >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}% (30d)
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Supply", value: Number(onChainInfo?.totalSupply || token.totalSupply).toLocaleString(), icon: Coins },
              { label: "Holders", value: MOCK_HOLDERS.length.toString(), icon: Users },
              { label: "Transactions", value: (tokenTxs.length + recentTxs.length).toString(), icon: Activity },
              { label: "Created", value: new Date(token.createdAt).toLocaleDateString(), icon: Clock },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="chart" className="space-y-6">
            <TabsList className="bg-muted/30 border border-border/30">
              <TabsTrigger value="chart">Price Chart</TabsTrigger>
              <TabsTrigger value="holders">Holders</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="info">Token Info</TabsTrigger>
            </TabsList>

            {/* Price Chart */}
            <TabsContent value="chart">
              <div className="glass-card p-6">
                <h3 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Price History (30d)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={priceData}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v.toFixed(4)} />
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="url(#priceGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* Holders */}
            <TabsContent value="holders">
              <div className="glass-card p-6">
                <h3 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Top Holders
                </h3>
                <div className="space-y-3">
                  {MOCK_HOLDERS.map((holder, i) => (
                    <div key={holder.address} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                      <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <span className="font-mono text-sm flex-1">{holder.address}</span>
                      <span className="text-sm font-medium">{holder.balance}</span>
                      <div className="w-24">
                        <div className="w-full bg-muted/50 rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${holder.percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{holder.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Transactions */}
            <TabsContent value="transactions">
              <div className="glass-card p-6">
                <h3 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Transaction History
                </h3>
                {tokenTxs.length === 0 && recentTxs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No transactions found</p>
                ) : (
                  <div className="space-y-2">
                    {tokenTxs.map((tx) => (
                      <div key={tx.hash} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20">
                        <div className={`w-2 h-2 rounded-full ${tx.status === "success" ? "bg-[hsl(var(--success))]" : tx.status === "pending" ? "bg-yellow-500 animate-pulse" : "bg-destructive"}`} />
                        <span className="text-xs font-mono text-muted-foreground">{tx.hash}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tx.type === "create" ? "bg-primary/10 text-primary" :
                          tx.type === "burn" ? "bg-destructive/10 text-destructive" :
                          "bg-muted/50 text-muted-foreground"
                        }`}>{tx.type}</span>
                        {tx.amount && <span className="text-sm font-medium">{Number(tx.amount).toLocaleString()}</span>}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(tx.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {recentTxs.map((tx) => (
                      <div key={tx.hash} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20">
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
                        <span className="text-xs font-mono text-muted-foreground">{tx.hash.slice(0, 16)}...</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">on-chain</span>
                        <span className="text-xs text-muted-foreground ml-auto">Block #{tx.blockNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Token Info */}
            <TabsContent value="info">
              <div className="glass-card p-6">
                <h3 className="text-lg font-heading font-semibold mb-4">Token Details</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "Name", value: onChainInfo?.name || token.name },
                    { label: "Symbol", value: onChainInfo?.symbol || token.symbol },
                    { label: "Decimals", value: String(onChainInfo?.decimals ?? token.decimals) },
                    { label: "Total Supply", value: Number(onChainInfo?.totalSupply || token.totalSupply).toLocaleString() },
                    { label: "Current Supply", value: Number(token.currentSupply).toLocaleString() },
                    { label: "Contract", value: token.contractAddress },
                    { label: "Creator", value: token.creator },
                    { label: "TX Hash", value: token.transactionHash },
                    { label: "Paused", value: token.isPaused ? "Yes" : "No" },
                    { label: "Description", value: token.description },
                    ...(token.website ? [{ label: "Website", value: token.website }] : []),
                    ...(token.twitter ? [{ label: "Twitter", value: token.twitter }] : []),
                  ].map((item) => (
                    <div key={item.label} className="bg-muted/20 rounded-lg p-3">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <p className="text-sm font-medium mt-0.5 break-all">{item.value}</p>
                    </div>
                  ))}
                </div>

                {onChainInfo && (
                  <div className="mt-4 bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20 rounded-lg p-3 text-xs text-[hsl(var(--success))]">
                    ✓ On-chain data verified from GydsChain RPC
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default TokenDetailPage;
