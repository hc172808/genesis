/** Presale client — encodes calls to Presale.sol */
import { sendTransaction, type EthereumProvider } from "./walletAdapter";
import { toWei } from "./dexRouter";

const SEL_CONTRIBUTE = "0xd7bb99ba"; // contribute()
const SEL_CLAIM = "0x4e71d92d";       // claim()
const SEL_REFUND = "0x590e1ae3";      // refund()

export const contribute = (p: { provider: EthereumProvider; user: string; presale: string; amountGyds: string }) =>
  sendTransaction(p.provider, {
    from: p.user, to: p.presale, data: SEL_CONTRIBUTE,
    value: "0x" + toWei(p.amountGyds, 18).toString(16),
  });

export const claimPresale = (p: { provider: EthereumProvider; user: string; presale: string }) =>
  sendTransaction(p.provider, { from: p.user, to: p.presale, data: SEL_CLAIM });

export const refundPresale = (p: { provider: EthereumProvider; user: string; presale: string }) =>
  sendTransaction(p.provider, { from: p.user, to: p.presale, data: SEL_REFUND });
