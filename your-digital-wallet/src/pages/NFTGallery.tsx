import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, EyeOff, Eye, Flame, ExternalLink, Filter, ShieldAlert, Inbox, X } from "lucide-react";
import BottomNav from "@/components/wallet/BottomNav";
import { getWalletAddress } from "@/lib/wallet-core";
import { getActiveChainId } from "@/lib/chain-context";
import { getChainById } from "@/lib/chain-adapter";
import {
  type NFTMetadata,
  hideNft,
  unhideNft,
  getBurnAddress,
  resolveIpfs,
} from "@/lib/nft-manager";
import { fetchNftsFromIndexer, getNetworkEnvironment } from "@/lib/nft-indexer";
import { useToast } from "@/hooks/use-toast";

type FilterMode = "all" | "hidden" | "spam";

const NFTGallery = () => {
  const { toast } = useToast();
  const [nfts, setNfts] = useState<NFTMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedNft, setSelectedNft] = useState<NFTMetadata | null>(null);
  const wallet = getWalletAddress();
  const chainId = getActiveChainId();
  const chain = getChainById(chainId);

  const networkEnv = getNetworkEnvironment();

  useEffect(() => {
    if (!wallet || !chain) return;
    setLoading(true);
    fetchNftsFromIndexer(wallet, chainId)
      .then(setNfts)
      .finally(() => setLoading(false));
  }, [wallet, chainId]);

  const filtered = nfts.filter((nft) => {
    if (filter === "hidden") return nft.isHidden;
    if (filter === "spam") return nft.isSpam;
    return !nft.isHidden && !nft.isSpam;
  });

  const handleHide = (nftId: string) => {
    hideNft(nftId);
    setNfts((prev) => prev.map((n) => n.id === nftId ? { ...n, isHidden: true } : n));
    toast({ title: "NFT hidden" });
  };

  const handleUnhide = (nftId: string) => {
    unhideNft(nftId);
    setNfts((prev) => prev.map((n) => n.id === nftId ? { ...n, isHidden: false } : n));
    toast({ title: "NFT visible again" });
  };

  const handleBurn = (nft: NFTMetadata) => {
    toast({
      title: "Burn NFT",
      description: `To burn, send ${nft.name} to ${getBurnAddress().slice(0, 10)}... via the Send page.`,
    });
    setSelectedNft(null);
  };

  const filterOptions: { value: FilterMode; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "Collectibles", icon: <Image size={14} /> },
    { value: "hidden", label: "Hidden", icon: <EyeOff size={14} /> },
    { value: "spam", label: "Spam", icon: <ShieldAlert size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-display font-bold text-foreground">NFT Gallery</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full gradient-primary" />
              {chain?.name || "GYDS"}
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase">
              {networkEnv}
            </span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === opt.value
                  ? "gradient-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.icon} {opt.label}
              {opt.value === "spam" && nfts.filter((n) => n.isSpam).length > 0 && (
                <span className="ml-1 bg-destructive/20 text-destructive text-[10px] rounded-full px-1.5">
                  {nfts.filter((n) => n.isSpam).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading NFTs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
              <Image size={28} className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold mb-1">
              {filter === "all" ? "No collectibles yet" : filter === "hidden" ? "No hidden NFTs" : "No spam detected"}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {filter === "all"
                ? "NFTs and collectibles you own will appear here. They are fetched from the blockchain automatically."
                : filter === "hidden"
                ? "NFTs you hide will appear here. You can unhide them anytime."
                : "Suspicious NFTs are automatically flagged. You can review and burn them."}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((nft, i) => (
              <motion.div
                key={nft.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedNft(nft)}
                className="bg-card rounded-xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all group"
              >
                <div className="aspect-square bg-secondary relative overflow-hidden">
                  {nft.animationUrl ? (
                    <video
                      src={resolveIpfs(nft.animationUrl)}
                      className="w-full h-full object-cover"
                      autoPlay muted loop playsInline
                    />
                  ) : (
                    <img
                      src={resolveIpfs(nft.image)}
                      alt={nft.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  )}
                  {nft.isSpam && (
                    <div className="absolute top-2 left-2 bg-destructive/90 text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <ShieldAlert size={10} /> SPAM
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-foreground truncate">{nft.name || `#${nft.tokenId}`}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{nft.collection}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* NFT Detail Modal */}
      <AnimatePresence>
        {selectedNft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setSelectedNft(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              <div className="p-4 flex justify-between items-center border-b border-border">
                <h2 className="font-display font-bold text-foreground">{selectedNft.name || `#${selectedNft.tokenId}`}</h2>
                <button onClick={() => setSelectedNft(null)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                  <X size={16} />
                </button>
              </div>

              {/* Media */}
              <div className="aspect-square bg-secondary">
                {selectedNft.animationUrl ? (
                  <video
                    src={resolveIpfs(selectedNft.animationUrl)}
                    className="w-full h-full object-contain"
                    controls autoPlay muted loop playsInline
                  />
                ) : (
                  <img
                    src={resolveIpfs(selectedNft.image)}
                    alt={selectedNft.name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Info */}
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Collection</p>
                  <p className="text-sm font-semibold text-foreground">{selectedNft.collection}</p>
                </div>

                {selectedNft.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-foreground/80">{selectedNft.description}</p>
                  </div>
                )}

                {selectedNft.attributes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Attributes</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNft.attributes.map((attr, i) => (
                        <div key={i} className="bg-secondary rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">{attr.trait_type}</p>
                          <p className="text-xs font-semibold text-foreground">{attr.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contract info */}
                <div className="bg-secondary rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Contract</span>
                    <span className="text-foreground font-mono">
                      {selectedNft.contractAddress.slice(0, 6)}...{selectedNft.contractAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Token ID</span>
                    <span className="text-foreground">{selectedNft.tokenId}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Chain</span>
                    <span className="text-foreground">{chain?.name || selectedNft.chainId}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!selectedNft.isHidden ? (
                    <button
                      onClick={() => { handleHide(selectedNft.id); setSelectedNft(null); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-secondary text-foreground py-3 rounded-xl text-sm font-semibold hover:bg-secondary/70 transition-colors"
                    >
                      <EyeOff size={16} /> Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => { handleUnhide(selectedNft.id); setSelectedNft(null); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-secondary text-foreground py-3 rounded-xl text-sm font-semibold hover:bg-secondary/70 transition-colors"
                    >
                      <Eye size={16} /> Unhide
                    </button>
                  )}
                  <button
                    onClick={() => handleBurn(selectedNft)}
                    className="flex-1 flex items-center justify-center gap-2 bg-destructive/10 text-destructive py-3 rounded-xl text-sm font-semibold hover:bg-destructive/20 transition-colors"
                  >
                    <Flame size={16} /> Burn
                  </button>
                  {chain && (
                    <a
                      href={`${chain.blockExplorer}/token/${selectedNft.contractAddress}?a=${selectedNft.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 flex items-center justify-center bg-secondary text-muted-foreground rounded-xl hover:text-foreground transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default NFTGallery;
