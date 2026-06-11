/**
 * NFT Manager — handles fetching, caching, hiding, and spam detection for NFTs.
 * Works with EVM chains via standard ERC-721/1155 metadata patterns.
 */

const HIDDEN_NFTS_KEY = "gyds_hidden_nfts";
const NFT_CACHE_KEY = "gyds_nft_cache";

export interface NFTMetadata {
  id: string;
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;           // IPFS or HTTP URL
  animationUrl?: string;   // Video/audio
  collection: string;
  chainId: string;
  attributes: { trait_type: string; value: string }[];
  isSpam: boolean;
  isHidden: boolean;
}

// ── Spam Detection ──────────────────────────────────────

const SPAM_SIGNALS = [
  /airdrop/i,
  /claim.*free/i,
  /visit.*\.com/i,
  /opensea.*\.xyz/i,
  /\.gift/i,
  /\$\d+.*reward/i,
  /you.*won/i,
  /congratulation/i,
];

export const isLikelySpam = (nft: Partial<NFTMetadata>): boolean => {
  const text = `${nft.name || ""} ${nft.description || ""} ${nft.collection || ""}`;
  return SPAM_SIGNALS.some((re) => re.test(text));
};

// ── IPFS Helper ─────────────────────────────────────────

export const resolveIpfs = (url: string): string => {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }
  return url;
};

// ── Hidden NFTs ─────────────────────────────────────────

export const getHiddenNfts = (): string[] => {
  try {
    const stored = localStorage.getItem(HIDDEN_NFTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

export const hideNft = (nftId: string): void => {
  const hidden = getHiddenNfts();
  if (!hidden.includes(nftId)) {
    hidden.push(nftId);
    localStorage.setItem(HIDDEN_NFTS_KEY, JSON.stringify(hidden));
  }
};

export const unhideNft = (nftId: string): void => {
  const hidden = getHiddenNfts().filter((id) => id !== nftId);
  localStorage.setItem(HIDDEN_NFTS_KEY, JSON.stringify(hidden));
};

// ── Cache ───────────────────────────────────────────────

export const getCachedNfts = (address: string, chainId: string): NFTMetadata[] => {
  try {
    const stored = localStorage.getItem(`${NFT_CACHE_KEY}_${chainId}_${address.toLowerCase()}`);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const cacheNfts = (address: string, chainId: string, nfts: NFTMetadata[]): void => {
  try {
    localStorage.setItem(
      `${NFT_CACHE_KEY}_${chainId}_${address.toLowerCase()}`,
      JSON.stringify(nfts)
    );
  } catch { /* storage full */ }
};

// ── Fetch NFTs from RPC (ERC-721 enumerable) ────────────

export const fetchNfts = async (
  address: string,
  chainId: string,
  rpcUrl: string
): Promise<NFTMetadata[]> => {
  // For production, this would use an indexer API (Alchemy, Moralis, etc.)
  // For now, return cached or demo data
  const cached = getCachedNfts(address, chainId);
  if (cached.length > 0) return applyHiddenState(cached);

  // Demo: return empty for real chains, show placeholder guidance
  return [];
};

const applyHiddenState = (nfts: NFTMetadata[]): NFTMetadata[] => {
  const hidden = getHiddenNfts();
  return nfts.map((nft) => ({
    ...nft,
    isHidden: hidden.includes(nft.id),
    isSpam: nft.isSpam || isLikelySpam(nft),
  }));
};

// ── Burn NFT (send to dead address) ─────────────────────

export const getBurnAddress = (): string => "0x000000000000000000000000000000000000dEaD";
