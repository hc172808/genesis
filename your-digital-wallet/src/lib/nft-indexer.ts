/**
 * NFT Indexer — fetches real NFT data from blockchain indexers.
 * Supports Alchemy, Moralis, and direct JSON-RPC fallback.
 * Works with mainnet, testnet, and devnet configurations.
 */

import { type NFTMetadata, isLikelySpam, resolveIpfs, getHiddenNfts } from "./nft-manager";
import { getChainById } from "./chain-adapter";

// ── Types ────────────────────────────────────────────────

export type NetworkEnvironment = "mainnet" | "testnet" | "devnet";

interface IndexerConfig {
  provider: "alchemy" | "moralis" | "rpc";
  apiKey: string;
  environment: NetworkEnvironment;
}

interface AlchemyNFT {
  contract: { address: string };
  tokenId: string;
  title: string;
  description: string;
  media: { gateway: string; raw: string }[];
  metadata?: {
    attributes?: { trait_type: string; value: string }[];
    animation_url?: string;
  };
  contractMetadata?: { name: string; symbol: string };
  spamInfo?: { isSpam: boolean };
}

interface MoralisNFT {
  token_address: string;
  token_id: string;
  name: string;
  metadata?: string;
  token_uri?: string;
  possible_spam: boolean;
  contract_type: string;
}

// ── Chain → Indexer URL mapping ──────────────────────────

const ALCHEMY_NETWORKS: Record<string, Record<NetworkEnvironment, string>> = {
  ethereum: {
    mainnet: "eth-mainnet",
    testnet: "eth-sepolia",
    devnet: "eth-sepolia",
  },
  polygon: {
    mainnet: "polygon-mainnet",
    testnet: "polygon-amoy",
    devnet: "polygon-amoy",
  },
};

const MORALIS_CHAINS: Record<string, Record<NetworkEnvironment, string>> = {
  ethereum: { mainnet: "eth", testnet: "sepolia", devnet: "sepolia" },
  polygon: { mainnet: "polygon", testnet: "polygon amoy", devnet: "polygon amoy" },
};

// ── Config Resolution ────────────────────────────────────

const getIndexerConfig = (): IndexerConfig => {
  const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY || "";
  const moralisKey = import.meta.env.VITE_MORALIS_API_KEY || "";
  const env = (import.meta.env.VITE_NETWORK_ENV || "mainnet") as NetworkEnvironment;

  if (alchemyKey) return { provider: "alchemy", apiKey: alchemyKey, environment: env };
  if (moralisKey) return { provider: "moralis", apiKey: moralisKey, environment: env };
  return { provider: "rpc", apiKey: "", environment: env };
};

// ── Alchemy NFT Fetcher ──────────────────────────────────

const fetchFromAlchemy = async (
  address: string,
  chainId: string,
  apiKey: string,
  env: NetworkEnvironment
): Promise<NFTMetadata[]> => {
  const networkMap = ALCHEMY_NETWORKS[chainId];
  if (!networkMap) return [];

  const network = networkMap[env];
  const baseUrl = `https://${network}.g.alchemy.com/nft/v3/${apiKey}`;
  const url = `${baseUrl}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Alchemy NFT fetch failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const nfts: AlchemyNFT[] = data.ownedNfts || [];
  const hidden = getHiddenNfts();

  return nfts.map((nft): NFTMetadata => {
    const image = nft.media?.[0]?.gateway || nft.media?.[0]?.raw || "";
    const meta: NFTMetadata = {
      id: `${nft.contract.address}_${nft.tokenId}`,
      contractAddress: nft.contract.address,
      tokenId: nft.tokenId,
      name: nft.title || `#${nft.tokenId}`,
      description: nft.description || "",
      image: resolveIpfs(image),
      animationUrl: nft.metadata?.animation_url ? resolveIpfs(nft.metadata.animation_url) : undefined,
      collection: nft.contractMetadata?.name || "Unknown Collection",
      chainId,
      attributes: nft.metadata?.attributes || [],
      isSpam: nft.spamInfo?.isSpam || false,
      isHidden: false,
    };
    meta.isSpam = meta.isSpam || isLikelySpam(meta);
    meta.isHidden = hidden.includes(meta.id);
    return meta;
  });
};

// ── Moralis NFT Fetcher ──────────────────────────────────

const fetchFromMoralis = async (
  address: string,
  chainId: string,
  apiKey: string,
  env: NetworkEnvironment
): Promise<NFTMetadata[]> => {
  const chainMap = MORALIS_CHAINS[chainId];
  if (!chainMap) return [];

  const chain = chainMap[env];
  const url = `https://deep-index.moralis.io/api/v2.2/${address}/nft?chain=${chain}&format=decimal&limit=100&normalizeMetadata=true`;

  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey, accept: "application/json" },
  });
  if (!res.ok) {
    console.warn(`Moralis NFT fetch failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const nfts: MoralisNFT[] = data.result || [];
  const hidden = getHiddenNfts();

  return nfts.map((nft): NFTMetadata => {
    let parsed: any = {};
    try { parsed = nft.metadata ? JSON.parse(nft.metadata) : {}; } catch {}

    const meta: NFTMetadata = {
      id: `${nft.token_address}_${nft.token_id}`,
      contractAddress: nft.token_address,
      tokenId: nft.token_id,
      name: parsed.name || nft.name || `#${nft.token_id}`,
      description: parsed.description || "",
      image: resolveIpfs(parsed.image || ""),
      animationUrl: parsed.animation_url ? resolveIpfs(parsed.animation_url) : undefined,
      collection: nft.name || "Unknown Collection",
      chainId,
      attributes: parsed.attributes || [],
      isSpam: nft.possible_spam || false,
      isHidden: false,
    };
    meta.isSpam = meta.isSpam || isLikelySpam(meta);
    meta.isHidden = hidden.includes(meta.id);
    return meta;
  });
};

// ── JSON-RPC Fallback (ERC-721 balanceOf) ────────────────

const fetchFromRpc = async (
  address: string,
  chainId: string
): Promise<NFTMetadata[]> => {
  // Without an indexer, we can only check known contracts.
  // Return empty — users should configure an API key for real data.
  console.info(
    `[NFT Indexer] No Alchemy/Moralis API key configured. ` +
    `Set VITE_ALCHEMY_API_KEY or VITE_MORALIS_API_KEY in .env for real NFT data.`
  );
  return [];
};

// ── Solana NFT Fetcher (Alchemy) ─────────────────────────

const fetchSolanaNfts = async (
  address: string,
  apiKey: string,
  env: NetworkEnvironment
): Promise<NFTMetadata[]> => {
  if (!apiKey) return [];

  const network = env === "mainnet" ? "solana-mainnet" : "solana-devnet";
  const url = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const hidden = getHiddenNfts();

    return (data.ownedNfts || []).map((nft: any): NFTMetadata => ({
      id: `${nft.contract?.address || "sol"}_${nft.tokenId || nft.id?.tokenId || "0"}`,
      contractAddress: nft.contract?.address || "",
      tokenId: nft.tokenId || nft.id?.tokenId || "0",
      name: nft.title || nft.name || "Solana NFT",
      description: nft.description || "",
      image: resolveIpfs(nft.media?.[0]?.gateway || nft.image?.originalUrl || ""),
      collection: nft.collection?.name || "Solana Collection",
      chainId: "solana",
      attributes: nft.raw?.metadata?.attributes || [],
      isSpam: isLikelySpam({ name: nft.title, description: nft.description }),
      isHidden: hidden.includes(`${nft.contract?.address || "sol"}_${nft.tokenId || "0"}`),
    }));
  } catch {
    return [];
  }
};

// ── Public API ───────────────────────────────────────────

export const fetchNftsFromIndexer = async (
  address: string,
  chainId: string
): Promise<NFTMetadata[]> => {
  const config = getIndexerConfig();

  // Solana uses its own path
  if (chainId === "solana") {
    return fetchSolanaNfts(address, config.apiKey, config.environment);
  }

  // EVM chains
  switch (config.provider) {
    case "alchemy":
      return fetchFromAlchemy(address, chainId, config.apiKey, config.environment);
    case "moralis":
      return fetchFromMoralis(address, chainId, config.apiKey, config.environment);
    default:
      return fetchFromRpc(address, chainId);
  }
};

export const getNetworkEnvironment = (): NetworkEnvironment => {
  return (import.meta.env.VITE_NETWORK_ENV || "mainnet") as NetworkEnvironment;
};
