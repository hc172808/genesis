# GYDS Program Library (GPL)

A modular Solidity contract suite for the **GYDS Network** (Chain ID `13370`),
inspired by Solana's **Solana Program Library (SPL)** and its Token / Account
architecture, but adapted for an EVM execution environment.

GPL provides a small set of cooperating "programs" (contracts) that any dApp on
the GYDS Network can compose:

| Program | File | Role |
|---|---|---|
| **System Program** | `GPLSystem.sol` | Native account creation, GYDS transfers, program registry. Analogous to Solana's System Program. |
| **Accounts Program** | `GPLAccounts.sol` | Generic "account" abstraction — typed data slots owned by a program (similar to Solana account model). |
| **Token Program (GYDS-20)** | `GPLToken.sol` | Centralized fungible-token program. Mints, transfers, burns, approvals — like SPL Token. |
| **Staking Program** | `GPLStaking.sol` | Stake any GYDS-20 token into pools that emit reward tokens over time. |
| **Program Base** | `IGPLProgram.sol` | Shared interface every GPL program implements (id, version, owner). |

## Design principles

1. **One program, many accounts.** A single Token Program contract holds *all*
   GYDS-20 mints and token accounts, like SPL. Creating a new token does not
   deploy a new contract — it registers a new mint inside `GPLToken`.
2. **Account ownership.** Every account stored in `GPLAccounts` declares an
   `owner` program. Only the owner program may mutate the account's data.
3. **Composability.** Programs call each other through `IGPLProgram` interfaces
   so new programs (governance, vesting, escrow, AMM…) can be added without
   forking the core.
4. **Upgrade path.** Each program is registered in `GPLSystem.programs` by id;
   the System Program owner can publish a new implementation address while
   preserving the on-chain id.

## Layout

```
contracts/gpl/
├── IGPLProgram.sol     # base interface
├── GPLSystem.sol       # registry + native transfers
├── GPLAccounts.sol     # generic typed accounts
├── GPLToken.sol        # GYDS-20 fungible token program
└── GPLStaking.sol      # staking pools
```

## Deployment order (suggested)

1. Deploy `GPLSystem`.
2. Deploy `GPLAccounts(systemAddress)` and register it via
   `system.registerProgram("accounts", address)`.
3. Deploy `GPLToken(systemAddress)` and register as `"token"`.
4. Deploy `GPLStaking(systemAddress, tokenAddress)` and register as `"staking"`.

After deployment, dApps only need the `GPLSystem` address; everything else is
discovered through `system.getProgram(id)`.

> ⚠️ These contracts are reference implementations meant to be reviewed and
> audited before mainnet deployment on GYDS Network.
