/** Staking client — encodes calls to the StakingRewards contract. */
import { sendTransaction, type EthereumProvider } from "./walletAdapter";
import { encodeApproveCall } from "./erc20Factory";
import { rpcCall } from "./rpcClient";
import { toWei } from "./dexRouter";

const SEL_STAKE = "0xa694fc3a";       // stake(uint256)
const SEL_WITHDRAW = "0x2e1a7d4d";    // withdraw(uint256)
const SEL_GET_REWARD = "0x3d18b912";  // getReward()
const SEL_EARNED = "0x008cc262";      // earned(address)
const SEL_BALANCE_OF = "0x70a08231";  // balanceOf(address)

const padAddr = (a: string) => a.replace(/^0x/, "").toLowerCase().padStart(64, "0");
const padU256 = (v: bigint) => v.toString(16).padStart(64, "0");

const encodeUint = (sel: string, v: bigint) => `${sel}${padU256(v)}`;

export interface StakeParams {
  provider: EthereumProvider;
  user: string;
  stakingContract: string;
  stakingToken: string;
  amount: string;
  decimals?: number;
}

export const approveAndStake = async (p: StakeParams): Promise<string[]> => {
  const decimals = p.decimals ?? 18;
  const approveData = encodeApproveCall(p.stakingContract, p.amount, decimals);
  const approveTx = await sendTransaction(p.provider, { from: p.user, to: p.stakingToken, data: approveData });
  const amountWei = toWei(p.amount, decimals);
  const stakeTx = await sendTransaction(p.provider, { from: p.user, to: p.stakingContract, data: encodeUint(SEL_STAKE, amountWei) });
  return [approveTx, stakeTx];
};

export const unstake = async (p: { provider: EthereumProvider; user: string; stakingContract: string; amount: string; decimals?: number }) =>
  sendTransaction(p.provider, { from: p.user, to: p.stakingContract, data: encodeUint(SEL_WITHDRAW, toWei(p.amount, p.decimals ?? 18)) });

export const claimRewards = async (p: { provider: EthereumProvider; user: string; stakingContract: string }) =>
  sendTransaction(p.provider, { from: p.user, to: p.stakingContract, data: SEL_GET_REWARD });

export const readEarned = async (contract: string, user: string): Promise<bigint> => {
  const res = await rpcCall<string>({ method: "eth_call", params: [{ to: contract, data: `${SEL_EARNED}${padAddr(user)}` }, "latest"] });
  return BigInt(res || "0x0");
};

export const readStakedBalance = async (contract: string, user: string): Promise<bigint> => {
  const res = await rpcCall<string>({ method: "eth_call", params: [{ to: contract, data: `${SEL_BALANCE_OF}${padAddr(user)}` }, "latest"] });
  return BigInt(res || "0x0");
};
