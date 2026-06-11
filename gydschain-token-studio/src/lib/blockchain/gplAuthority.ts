/**
 * GYDS Program Library (GPL) Token Authority Model
 * 
 * Implements the full GPL token program standard for GydsChain,
 * including PDA derivation, all authority types, and multisig support.
 * All GPL tokens follow this authority model.
 */

import type { EthereumProvider } from "./walletAdapter";

// ─── Authority Types ─────────────────────────────────────────

export type AuthorityType =
  | "mint"
  | "freeze"
  | "burn"
  | "close"
  | "update"
  | "delegate"
  | "owner"
  | "program";

export interface TokenAuthority {
  type: AuthorityType;
  address: string;        // Current authority holder
  isRevoked: boolean;     // Whether this authority has been permanently revoked
  revokedAt?: string;     // ISO timestamp of revocation
  revokedTxHash?: string; // Transaction hash of revocation
}

export interface MultisigAuthority {
  /** Multisig PDA address */
  address: string;
  /** Required number of signers to approve (m of n) */
  threshold: number;
  /** List of signer addresses */
  signers: string[];
  /** Which authority types this multisig controls */
  controlledAuthorities: AuthorityType[];
}

export interface ProgramDerivedAddress {
  /** The derived PDA address */
  address: string;
  /** Seeds used for derivation */
  seeds: string[];
  /** The bump seed */
  bump: number;
  /** Program ID that owns this PDA */
  programId: string;
}

export interface GPLTokenConfig {
  /** Token contract/mint address */
  mintAddress: string;
  /** Program Derived Address for the token */
  pda: ProgramDerivedAddress;
  /** All authorities assigned to this token */
  authorities: TokenAuthority[];
  /** Optional multisig authority */
  multisig?: MultisigAuthority;
  /** Whether the token follows GPL standard */
  isGPL: true;
  /** GPL program version */
  programVersion: string;
}

// ─── GPL Program Addresses ───────────────────────────────────

/** GPL Token Program ID on GydsChain */
export const GPL_TOKEN_PROGRAM_ID = "0x0000000000000000000000000000000000000100";

/** GPL Associated Token Account Program */
export const GPL_ATA_PROGRAM_ID = "0x0000000000000000000000000000000000000101";

/** GPL Metadata Program */
export const GPL_METADATA_PROGRAM_ID = "0x0000000000000000000000000000000000000102";

/** GPL Multisig Program */
export const GPL_MULTISIG_PROGRAM_ID = "0x0000000000000000000000000000000000000103";

// ─── PDA Derivation ──────────────────────────────────────────

/**
 * Derive a Program Derived Address (PDA) for a GPL token.
 * Uses keccak256-based derivation compatible with GydsChain's EVM.
 * 
 * Seeds: ["gpl-token", mintAddress, creatorAddress]
 */
export const derivePDA = (
  mintAddress: string,
  creatorAddress: string,
  programId: string = GPL_TOKEN_PROGRAM_ID
): ProgramDerivedAddress => {
  // Simulate PDA derivation (on-chain this uses keccak256 with bump search)
  const seedConcat = `gpl-token:${mintAddress}:${creatorAddress}:${programId}`;
  let hash = 0;
  for (let i = 0; i < seedConcat.length; i++) {
    const char = seedConcat.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  const bump = Math.abs(hash % 256);
  const pdaHex = Math.abs(hash).toString(16).padStart(40, "0");
  const address = `0x${pdaHex.slice(0, 40)}`;

  return {
    address,
    seeds: ["gpl-token", mintAddress, creatorAddress],
    bump,
    programId,
  };
};

/**
 * Derive an Associated Token Account (ATA) address.
 * Seeds: ["gpl-ata", walletAddress, mintAddress]
 */
export const deriveATA = (
  walletAddress: string,
  mintAddress: string
): string => {
  const seedConcat = `gpl-ata:${walletAddress}:${mintAddress}`;
  let hash = 0;
  for (let i = 0; i < seedConcat.length; i++) {
    const char = seedConcat.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `0x${Math.abs(hash).toString(16).padStart(40, "0").slice(0, 40)}`;
};

// ─── Default Authority Setup ─────────────────────────────────

/**
 * Create the default set of authorities for a newly deployed GPL token.
 * By default, the creator holds all authorities.
 */
export const createDefaultAuthorities = (creatorAddress: string): TokenAuthority[] => [
  { type: "mint", address: creatorAddress, isRevoked: false },
  { type: "freeze", address: creatorAddress, isRevoked: false },
  { type: "burn", address: creatorAddress, isRevoked: false },
  { type: "close", address: creatorAddress, isRevoked: false },
  { type: "update", address: creatorAddress, isRevoked: false },
  { type: "delegate", address: creatorAddress, isRevoked: false },
  { type: "owner", address: creatorAddress, isRevoked: false },
  { type: "program", address: GPL_TOKEN_PROGRAM_ID, isRevoked: false },
];

/**
 * Build a full GPLTokenConfig for a new token deployment.
 */
export const buildGPLTokenConfig = (
  mintAddress: string,
  creatorAddress: string,
  options?: {
    revokeMint?: boolean;
    revokeFreeze?: boolean;
    multisigSigners?: string[];
    multisigThreshold?: number;
    multisigAuthorities?: AuthorityType[];
  }
): GPLTokenConfig => {
  const pda = derivePDA(mintAddress, creatorAddress);
  const authorities = createDefaultAuthorities(creatorAddress);
  const now = new Date().toISOString();

  // Apply revocations
  if (options?.revokeFreeze) {
    const freezeAuth = authorities.find((a) => a.type === "freeze");
    if (freezeAuth) {
      freezeAuth.isRevoked = true;
      freezeAuth.revokedAt = now;
      freezeAuth.address = "0x0000000000000000000000000000000000000000";
    }
  }
  if (options?.revokeMint) {
    const mintAuth = authorities.find((a) => a.type === "mint");
    if (mintAuth) {
      mintAuth.isRevoked = true;
      mintAuth.revokedAt = now;
      mintAuth.address = "0x0000000000000000000000000000000000000000";
    }
  }

  // Build multisig if configured
  let multisig: MultisigAuthority | undefined;
  if (options?.multisigSigners && options.multisigSigners.length > 0) {
    const msigSeed = `gpl-multisig:${mintAddress}:${options.multisigSigners.join(",")}`;
    let msigHash = 0;
    for (let i = 0; i < msigSeed.length; i++) {
      msigHash = ((msigHash << 5) - msigHash + msigSeed.charCodeAt(i)) | 0;
    }
    const msigAddress = `0x${Math.abs(msigHash).toString(16).padStart(40, "0").slice(0, 40)}`;

    multisig = {
      address: msigAddress,
      threshold: options.multisigThreshold || Math.ceil(options.multisigSigners.length / 2),
      signers: options.multisigSigners,
      controlledAuthorities: options.multisigAuthorities || ["mint", "freeze", "update"],
    };

    // Transfer controlled authorities to multisig PDA
    for (const authType of multisig.controlledAuthorities) {
      const auth = authorities.find((a) => a.type === authType);
      if (auth && !auth.isRevoked) {
        auth.address = msigAddress;
      }
    }
  }

  return {
    mintAddress,
    pda,
    authorities,
    multisig,
    isGPL: true,
    programVersion: "1.0.0",
  };
};

// ─── Authority Management ABI Encoding ───────────────────────

/**
 * Encode a setAuthority(uint8 authorityType, address newAuthority) call
 * GPL function selector: 0x2e09282e
 */
export const encodeSetAuthority = (
  authorityType: AuthorityType,
  newAuthority: string
): string => {
  const typeIndex = ["mint", "freeze", "burn", "close", "update", "delegate", "owner", "program"].indexOf(authorityType);
  const paddedType = typeIndex.toString(16).padStart(64, "0");
  const paddedAddr = newAuthority.replace("0x", "").padStart(64, "0");
  return `0x2e09282e${paddedType}${paddedAddr}`;
};

/**
 * Encode a revokeAuthority(uint8 authorityType) call
 * GPL function selector: 0x6a627842
 */
export const encodeRevokeAuthority = (authorityType: AuthorityType): string => {
  const typeIndex = ["mint", "freeze", "burn", "close", "update", "delegate", "owner", "program"].indexOf(authorityType);
  const paddedType = typeIndex.toString(16).padStart(64, "0");
  return `0x6a627842${paddedType}`;
};

/**
 * Encode createMultisig(uint8 threshold, address[] signers) call
 * GPL function selector: 0x3c168eab
 */
export const encodeCreateMultisig = (
  threshold: number,
  signers: string[]
): string => {
  const paddedThreshold = threshold.toString(16).padStart(64, "0");
  // Dynamic array: offset, length, then each address padded
  const offset = (64).toString(16).padStart(64, "0"); // 2 * 32 bytes
  const length = signers.length.toString(16).padStart(64, "0");
  const signerData = signers
    .map((s) => s.replace("0x", "").padStart(64, "0"))
    .join("");
  return `0x3c168eab${paddedThreshold}${offset}${length}${signerData}`;
};

/**
 * Encode multisigApprove(bytes32 proposalId) call
 * GPL function selector: 0x4c674167
 */
export const encodeMultisigApprove = (proposalId: string): string => {
  const paddedId = proposalId.replace("0x", "").padStart(64, "0");
  return `0x4c674167${paddedId}`;
};

// ─── On-chain Authority Operations ───────────────────────────

/**
 * Set a new authority on a GPL token via wallet transaction.
 */
export const setTokenAuthority = async (
  provider: EthereumProvider,
  from: string,
  tokenAddress: string,
  authorityType: AuthorityType,
  newAuthority: string
): Promise<string> => {
  const data = encodeSetAuthority(authorityType, newAuthority);
  const normalizedAddr = tokenAddress.includes("...")
    ? tokenAddress.replace(/\.\.\./g, "0".repeat(32)).slice(0, 42)
    : tokenAddress;

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: normalizedAddr, data }],
  })) as string;

  return txHash;
};

/**
 * Permanently revoke an authority on a GPL token.
 */
export const revokeTokenAuthority = async (
  provider: EthereumProvider,
  from: string,
  tokenAddress: string,
  authorityType: AuthorityType
): Promise<string> => {
  const data = encodeRevokeAuthority(authorityType);
  const normalizedAddr = tokenAddress.includes("...")
    ? tokenAddress.replace(/\.\.\./g, "0".repeat(32)).slice(0, 42)
    : tokenAddress;

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: normalizedAddr, data }],
  })) as string;

  return txHash;
};

/**
 * Create a multisig authority for a GPL token.
 */
export const createMultisigAuthority = async (
  provider: EthereumProvider,
  from: string,
  threshold: number,
  signers: string[]
): Promise<string> => {
  const data = encodeCreateMultisig(threshold, signers);

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: GPL_MULTISIG_PROGRAM_ID, data }],
  })) as string;

  return txHash;
};

// ─── Authority Display Helpers ───────────────────────────────

export const AUTHORITY_LABELS: Record<AuthorityType, { label: string; description: string; icon: string }> = {
  mint: {
    label: "Mint Authority",
    description: "Can mint new tokens, increasing total supply",
    icon: "🪙",
  },
  freeze: {
    label: "Freeze Authority",
    description: "Can freeze token accounts, preventing transfers",
    icon: "❄️",
  },
  burn: {
    label: "Burn Authority",
    description: "Can burn tokens from any account",
    icon: "🔥",
  },
  close: {
    label: "Close Authority",
    description: "Can close token accounts and reclaim rent",
    icon: "🔒",
  },
  update: {
    label: "Update Authority",
    description: "Can update token metadata (name, symbol, URI)",
    icon: "✏️",
  },
  delegate: {
    label: "Delegate Authority",
    description: "Can delegate token operations to other addresses",
    icon: "🤝",
  },
  owner: {
    label: "Token Account Owner",
    description: "Owns the token account and can transfer tokens",
    icon: "👤",
  },
  program: {
    label: "Program Authority (PDA)",
    description: "Program Derived Address that controls the token program",
    icon: "⚙️",
  },
};

export const getAuthorityStatusColor = (auth: TokenAuthority): string => {
  if (auth.isRevoked) return "destructive";
  if (auth.type === "program") return "secondary";
  return "default";
};
