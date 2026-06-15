import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, ExternalLink, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { DeployedToken } from "@/lib/blockchain/types";
import { getExplorerUrl } from "@/lib/blockchain/config";
import tokenGold from "@/assets/token-gold.png";
import tokenPurple from "@/assets/token-purple.png";

interface GalleryPageProps {
  tokens: DeployedToken[];
}

const TOKEN_LOGOS: Record<string, string> = {
  GGOLD: tokenGold,
  NTFY: tokenPurple,
};

const GalleryPage = ({ tokens }: GalleryPageProps) => {
  const [search, setSearch] = useState("");
  const filtered = tokens.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-heading font-bold mb-2">
            Token <span className="gradient-text">Gallery</span>
          </h1>
          <p className="text-muted-foreground mb-8">Browse all tokens on GydsChain</p>

          <div className="relative mb-8 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or symbol..."
              className="pl-10 bg-muted/50 border-border/50"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((token, i) => (
              <motion.div
                key={token.contractAddress}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 glow-effect group hover:border-primary/30 transition-all"
              >
                <Link to={`/token/${token.contractAddress}`} className="block">
                  <div className="flex items-center gap-3 mb-4">
                    {TOKEN_LOGOS[token.symbol] ? (
                      <img
                        src={TOKEN_LOGOS[token.symbol]}
                        alt={token.symbol}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Coins className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-heading font-semibold">{token.name}</h3>
                      <span className="text-xs text-primary font-mono">{token.symbol}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-muted/30 rounded-lg p-2.5">
                      <span className="text-muted-foreground text-xs">Supply</span>
                      <p className="font-medium text-sm">{Number(token.totalSupply).toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2.5">
                      <span className="text-muted-foreground text-xs">Creator</span>
                      <p className="font-mono text-xs">{token.creator}</p>
                    </div>
                  </div>
                </Link>
                <a
                  href={getExplorerUrl("token", token.contractAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                  View on Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No tokens found matching "{search}"</div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GalleryPage;
