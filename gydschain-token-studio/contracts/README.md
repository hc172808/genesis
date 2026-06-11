# GydsChain DEX — Minimal Uniswap V2 contracts

These are the **production-grade, minimal** Solidity sources for the DEX used by
the Lovable / Netlify Coin Tools front end. They are pin-compatible with the
ABIs encoded in `src/lib/blockchain/dexRouter.ts` and the addresses persisted by
`src/lib/blockchain/dexConfig.ts`.

Three contracts:

| File                  | Purpose                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `WGYDS.sol`           | Wrapped native GYDS (ERC-20 wrapper around `msg.value`). Required for native↔token swaps |
| `UniswapV2Factory.sol`| Creates and tracks CPMM pair contracts                                                   |
| `UniswapV2Router.sol` | User-facing entry point: `addLiquidity*`, `removeLiquidity*`, `swap*`                    |
| `UniswapV2Pair.sol`   | A single CPMM (`x * y = k`) pool. Deployed by the factory.                               |

The 84 / 16 protocol fee split is enforced inside `UniswapV2Pair._mintFee`:
every swap charges a `0.30%` fee; **84 % accrues to LPs**, **16 % accrues to
`feeTo`** (the protocol treasury). Set `feeTo` on the factory after deployment.

---

## 1 · Prerequisites

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init   # choose "Create a TypeScript project"
```

Copy all four `.sol` files into `contracts/` of your Hardhat project.

## 2 · `hardhat.config.ts`

```ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    gydsDevnet: {
      url: "https://rpc.netlifegy.com",
      chainId: 12345,
      accounts: [process.env.DEPLOYER_PK!],
    },
    gydsMainnet: {
      url: "https://rpc.netlifegy.com",
      chainId: 12346,
      accounts: [process.env.DEPLOYER_PK!],
    },
  },
};
export default config;
```

## 3 · Deployment script — `scripts/deploy.ts`

```ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const WGYDS = await (await ethers.getContractFactory("WGYDS")).deploy();
  await WGYDS.waitForDeployment();
  console.log("WGYDS    :", await WGYDS.getAddress());

  const Factory = await (await ethers.getContractFactory("UniswapV2Factory")).deploy(deployer.address);
  await Factory.waitForDeployment();
  console.log("Factory  :", await Factory.getAddress());

  const Router = await (await ethers.getContractFactory("UniswapV2Router"))
    .deploy(await Factory.getAddress(), await WGYDS.getAddress());
  await Router.waitForDeployment();
  console.log("Router   :", await Router.getAddress());

  // Optional: point fees to a treasury wallet (enables the 84/16 split)
  // await Factory.setFeeTo("0xYourTreasuryAddress");
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Run:

```bash
DEPLOYER_PK=0x... npx hardhat run scripts/deploy.ts --network gydsDevnet
```

## 4 · Wire the addresses into the front end

1. Open the app → **Admin → DEX tab**
2. Paste the three addresses (Factory, Router, WGYDS) printed by the deploy script
3. Click **Save**

That's it. `CreateLiquidity`, `SwapToken`, `RemoveLiquidity` and the `/pool-test`
page will all immediately start using the real contracts.

## 5 · Verifying the deploy

```bash
# Check WGYDS works
cast call $WGYDS "name()(string)" --rpc-url https://rpc.netlifegy.com
# → "Wrapped GYDS"

# Check Factory routes
cast call $FACTORY "feeToSetter()(address)" --rpc-url https://rpc.netlifegy.com
```

## 6 · Security notes

- Audit before mainnet deployment. These are minimal reference contracts.
- `setFeeTo` should point to a multi-sig wallet — anyone holding the
  `feeToSetter` key controls the protocol's 16 % cut.
- The `INIT_CODE_HASH` inside `UniswapV2Library` may need to be updated if you
  change `UniswapV2Pair` bytecode. Run `npx hardhat run scripts/init-hash.ts`
  to print it.
