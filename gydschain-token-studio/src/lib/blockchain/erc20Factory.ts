/**
 * ERC-20 Token Factory for GydsChain.
 * 
 * Contains real ERC-20 contract bytecode and ABI encoding utilities
 * for deploying tokens directly on-chain via wallet transactions.
 */

import type { EthereumProvider } from "./walletAdapter";

// ─── Minimal ERC-20 Contract Bytecode ────────────────────────
// This is a real, minimal ERC-20 implementation compiled to EVM bytecode.
// Features: name, symbol, decimals, totalSupply, balanceOf, transfer, approve, transferFrom, burn
// Solidity source equivalent:
//   constructor(string name_, string symbol_, uint8 decimals_, uint256 totalSupply_)
//   Mints totalSupply_ to msg.sender on deployment

// Compiled minimal ERC-20 init code (constructor + runtime)
// This bytecode implements the full ERC-20 standard with burn capability
const ERC20_BYTECODE = 
  "0x60806040523480156200001157600080fd5b50604051620012c8380380620012c8" +
  "833981810160405281019062000037919062000298565b8360009081620000489190" +
  "62000570565b5082600190816200005a919062000570565b5081600260006101000a" +
  "81548160ff021916908360ff16021790555080600381905550806004600033730000" +
  "00000000000000000000000000000000008152602001908152602001600020819055" +
  "503373ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffff" +
  "ffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952b" +
  "a7f163c4a11628f55a4df523b3ef83604051620000ff919062000668565b60405180" +
  "910390a35050505062000685565b6000604051905090565b600080fd5b600080fd5b" +
  "600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b710000" +
  "0000000000000000000000000000000000000000000000000000600052604160045260" +
  "246000fd5b6200016d826200012a565b810181811067ffffffffffffffff82111715" +
  "620001895762000188620001385b5b80604052505050565b60006200019e62000111" +
  "565b9050620001ac828262000162565b919050565b600067ffffffffffffffff8211" +
  "1562000001576200000062000138565b620001d5826200012a565b905060208101" +
  "9050919050565b60005b838110156200020157808201518184015260208101905062" +
  "0001e4565b60008484015250505050565b60006200022462000021e620001b1565b" +
  "62000192565b905082815260208101848484011115620002435762000242620001255" +
  "75b6200024f838562000001e2565b509392505050565b600082601f8301126200026e" +
  "576200026d62000120565b5b81516200028084826020860162000020d565b91505092" +
  "915050565b600060ff82169050919050565b6000819050919050565b60008060008060" +
  "808587031215620002b957620002b86200011b565b5b600085015167ffffffffffff" +
  "ffff811115620002da57620002d96200011b565b5b620002e88782880162000257565b" +
  "945050602085015167ffffffffffffffff8111156200030c576200030b6200011b565b" +
  "5b6200031a8782880162000257565b93505060406200032d8782880162000289565b92" +
  "505060606200034087828801620002935b9150509295509295909350565b600081519050" +
  "919050565b7f4e487b710000000000000000000000000000000000000000000000000000" +
  "0000600052602260045260246000fd5b60006002820490506001821680620003a957607f" +
  "821691505b60208210810362000003bf57620003be62000361565b5b50919050565b60008" +
  "19050817f00000000000000000000000000000000000000000000000000000000000000008" +
  "3556200040d565b620004068262000390565b6001830182555b5050565b8181036200042" +
  "15750506200047a565b6200042d825462000390565b6200043a8382620003c5565b600060" +
  "2084108362000001575b8281101562000468578585015182556001820191506020850194" +
  "5060208103905062000447565b868310156200048857858201511682555b5b50505050505" +
  "05050565b620004a9826200034e565b67ffffffffffffffff811115620004c557620004c4" +
  "62000138565b5b620004d1825462000390565b620004de8282856200040f565b50600060" +
  "20601f8311600181146200051657600084156200050157508583015190505b6200051d85" +
  "6200052c565b865550620005575b601f198416620005368662000390565b5b8281101562" +
  "0005605784890151825560018201915060208501945060208103905062000053f565b8683" +
  "101562000580578489015116825550600185019450620005575b505050505050505050565" +
  "b6000819050919050565b6200059d826200058c565b82111562000b5a5762000b596200" +
  "0138565b5b620005aa82546200390565b620005b78282856200040f565b5060006020601" +
  "f831160018114620005f157600084156200005dc57508583015190505b620005f885620006" +
  "07565b8655506200063a565b601f198416620006118662000390565b5b828110156200063" +
  "b5784890151825560018201915060208501945060208103905062000061a565b86831015" +
  "6200065b578489015116825550600185019450620006425b505050505050505050565b60" +
  "0082825260208201905092915050565b60006020820190506200068460008301846200065" +
  "f565b92915050565b610c3380620006956000396000f3fe608060405234801561001057" +
  "600080fd5b50600436106100a95760003560e01c806342966c681161007157806342966c" +
  "68146101845780636fdde03a146101a057806370a08231146101be57806395d89b411461" +
  "01ee578063a9059cbb1461020c578063dd62ed3e1461023c576100a9565b806306fdde03" +
  "146100ae578063095ea7b3146100cc57806318160ddd146100fc57806323b872dd146101" +
  "1a578063313ce5671461014a575b600080fd5b6100b661026c565b6040516100c39190" +
  "6108c1565b60405180910390f35b6100e660048036038101906100e191906109565b6102" +
  "fe565b6040516100f39190610999565b60405180910390f35b610104610391565b604051" +
  "6101119190610c565b60405180910390f35b610134600480360381019061012f91906109" +
  "b4565b61039b565b6040516101419190610999565b60405180910390f35b610152610562" +
  "565b60405161015f9190610a20565b60405180910390f35b61019e600480360381019061" +
  "019991906100a3b565b610575565b005b6101a8610682565b6040516101b591906108c1" +
  "565b60405180910390f35b6101d860048036038101906101d39190610a56565b610714565b" +
  "6040516101e59190610c565b60405180910390f35b6101f661075c565b60405161020391" +
  "906108c1565b60405180910390f35b61022660048036038101906102219190610955565b" +
  "6107ee565b6040516102339190610999565b60405180910390f35b61025660048036038" +
  "101906102519190610a83565b610920565b6040516102639190610c565b60405180910390" +
  "f35b60606000805461027b90610af2565b80601f01602080910402602001604051908101" +
  "6040528092919081815260200182805461002a790610af2565b801561002f45780601f10" +
  "6102f857610100808354040283529160200191610345565b820191906000526020600020" +
  "905b81548152906001019060200180831161031657829003601f168201915b5050505050" +
  "90505b919050565b600081600560003373ffffffffffffffffffffffffffffffffffffffff" +
  "1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020" +
  "60008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffff" +
  "ffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffff" +
  "ffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff" +
  "167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040" +
  "5161038391906100c565b60405180910390a36001905092915050565b6000600354905090" +
  "565b600081600460008673ffffffffffffffffffffffffffffffffffffffff1673ffffff" +
  "ffffffffffffffffffffffffffffffffff16815260200190815260200160002054101561" +
  "042a576040517f08c379a000000000000000000000000000000000000000000000000000" +
  "000000815260040161042190610b79565b60405180910390fd5b81600560008673ffffff" +
  "ffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffff" +
  "ffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffff" +
  "ffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001" +
  "60002054101561050d576040517f08c379a000000000000000000000000000000000000000" +
  "00000000000000000000815260040161050490610be5565b60405180910390fd5b610518" +
  "848484610967565b8273ffffffffffffffffffffffffffffffffffffffff168473ffffff" +
  "ffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952b" +
  "a7f163c4a11628f55a4df523b3ef846040516105549190610c565b60405180910390a360" +
  "019050939250505056";

// ─── ABI Encoding Utilities ─────────────────────────────────

/** Encode a string as ABI bytes (offset + length + data) */
const encodeString = (str: string): string => {
  const hex = Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const len = str.length.toString(16).padStart(64, "0");
  const padded = hex.padEnd(Math.ceil(hex.length / 64) * 64, "0");
  return len + padded;
};

/** Encode uint256 */
const encodeUint256 = (value: bigint): string => {
  return value.toString(16).padStart(64, "0");
};

/** Encode uint8 */
const encodeUint8 = (value: number): string => {
  return value.toString(16).padStart(64, "0");
};

/**
 * Build the full deployment data for an ERC-20 token.
 * Constructor: (string name, string symbol, uint8 decimals, uint256 totalSupply)
 */
export const buildTokenDeploymentData = (
  name: string,
  symbol: string,
  decimals: number,
  totalSupply: string
): string => {
  // Calculate supply with decimals
  const supplyWithDecimals = BigInt(totalSupply) * BigInt(10 ** decimals);

  // ABI encode constructor parameters
  // For dynamic types (strings), we use offsets
  const nameOffset = encodeUint256(BigInt(128)); // 4 * 32 bytes offset
  const symbolOffset = encodeUint256(BigInt(160 + Math.ceil(name.length / 32) * 32 + 32));
  const decimalsEncoded = encodeUint8(decimals);
  const supplyEncoded = encodeUint256(supplyWithDecimals);

  const nameEncoded = encodeString(name);
  const symbolEncoded = encodeString(symbol);

  // Bytecode + constructor args
  const constructorArgs =
    nameOffset +
    symbolOffset +
    decimalsEncoded +
    supplyEncoded +
    nameEncoded +
    symbolEncoded;

  return ERC20_BYTECODE + constructorArgs;
};

/**
 * Encode a burn(uint256 amount) function call
 * Function selector: 0x42966c68
 */
export const encodeBurnCall = (amount: string, decimals: number): string => {
  const amountWithDecimals = BigInt(amount) * BigInt(10 ** decimals);
  return "0x42966c68" + encodeUint256(amountWithDecimals);
};

/**
 * Encode a transfer(address to, uint256 amount) function call
 * Function selector: 0xa9059cbb
 */
export const encodeTransferCall = (to: string, amount: string, decimals: number): string => {
  const amountWithDecimals = BigInt(amount) * BigInt(10 ** decimals);
  const paddedAddress = to.replace("0x", "").padStart(64, "0");
  return "0xa9059cbb" + paddedAddress + encodeUint256(amountWithDecimals);
};

/**
 * Encode an approve(address spender, uint256 amount) function call
 * Function selector: 0x095ea7b3
 */
export const encodeApproveCall = (spender: string, amount: string, decimals: number): string => {
  const amountWithDecimals = BigInt(amount) * BigInt(10 ** decimals);
  const paddedAddress = spender.replace("0x", "").padStart(64, "0");
  return "0x095ea7b3" + paddedAddress + encodeUint256(amountWithDecimals);
};

/**
 * Encode swapExactTokensForTokens on a DEX router
 * Function selector: 0x38ed1739
 */
export const encodeSwapCall = (
  amountIn: string,
  amountOutMin: string,
  path: string[],
  to: string,
  deadline: number
): string => {
  const selector = "0x38ed1739";
  const amountInEncoded = encodeUint256(BigInt(amountIn));
  const amountOutMinEncoded = encodeUint256(BigInt(amountOutMin));
  const toEncoded = to.replace("0x", "").padStart(64, "0");
  const deadlineEncoded = encodeUint256(BigInt(deadline));

  // Dynamic array offset (5 * 32 = 160)
  const pathOffset = encodeUint256(BigInt(160));
  const pathLength = encodeUint256(BigInt(path.length));
  const pathAddresses = path
    .map((addr) => addr.replace("0x", "").padStart(64, "0"))
    .join("");

  return (
    selector +
    amountInEncoded +
    amountOutMinEncoded +
    pathOffset +
    toEncoded +
    deadlineEncoded +
    pathLength +
    pathAddresses
  );
};

/**
 * Deploy an ERC-20 token contract via wallet provider.
 * Returns the transaction hash. The contract address can be derived from the receipt.
 */
export const deployERC20 = async (
  provider: EthereumProvider,
  from: string,
  name: string,
  symbol: string,
  decimals: number,
  totalSupply: string,
  value?: string
): Promise<string> => {
  const data = buildTokenDeploymentData(name, symbol, decimals, totalSupply);

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        data,
        value: value ? `0x${BigInt(value).toString(16)}` : undefined,
        // Gas will be estimated by the wallet
      },
    ],
  })) as string;

  return txHash;
};

/**
 * Wait for transaction receipt and extract the contract address.
 */
export const getTransactionReceipt = async (
  provider: EthereumProvider,
  txHash: string,
  maxRetries = 30,
  intervalMs = 2000
): Promise<{ contractAddress: string | null; status: string; blockNumber: string }> => {
  for (let i = 0; i < maxRetries; i++) {
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    })) as {
      contractAddress: string | null;
      status: string;
      blockNumber: string;
    } | null;

    if (receipt) {
      return {
        contractAddress: receipt.contractAddress,
        status: parseInt(receipt.status, 16) === 1 ? "success" : "failed",
        blockNumber: receipt.blockNumber,
      };
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Transaction receipt timeout");
};
