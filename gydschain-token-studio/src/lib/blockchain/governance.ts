/** Governance client — encodes calls to GovernorSimple. */
import { sendTransaction, type EthereumProvider } from "./walletAdapter";

const SEL_PROPOSE = "0xda95691a";     // propose(string)
const SEL_CAST_VOTE = "0x56781388";   // castVote(uint256,uint8)

const padU256 = (v: bigint | number) => BigInt(v).toString(16).padStart(64, "0");

const encodeString = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  const len = padU256(BigInt(bytes.length));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const paddedHex = hex.padEnd(Math.ceil(hex.length / 64) * 64, "0");
  return `0000000000000000000000000000000000000000000000000000000000000020${len}${paddedHex}`;
};

export const proposeOnChain = async (
  provider: EthereumProvider, user: string, governor: string, description: string
) => sendTransaction(provider, { from: user, to: governor, data: SEL_PROPOSE + encodeString(description) });

export type VoteChoice = 0 | 1 | 2; // Against=0, For=1, Abstain=2
export const castVoteOnChain = async (
  provider: EthereumProvider, user: string, governor: string, proposalId: number, choice: VoteChoice
) => sendTransaction(provider, {
  from: user, to: governor,
  data: SEL_CAST_VOTE + padU256(BigInt(proposalId)) + padU256(BigInt(choice)),
});
