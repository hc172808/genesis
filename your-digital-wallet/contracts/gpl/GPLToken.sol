// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IGPLProgram} from "./IGPLProgram.sol";

/// @title GPLToken — GYDS-20 Token Program
/// @notice Centralized fungible-token program inspired by SPL Token. A single
///         contract manages every GYDS-20 mint, every token account, and all
///         transfer/approve logic. Creating a new token registers a new mint
///         entry; it does NOT deploy a new contract.
contract GPLToken is IGPLProgram {
    bytes32 public constant override programId = keccak256("gpl.token.v1");
    uint256 public constant override programVersion = 1_000_000;
    address public immutable override system;

    struct Mint {
        address mintAuthority;     // can mint
        address freezeAuthority;   // can freeze accounts; address(0) disables
        uint8   decimals;
        uint256 supply;
        string  name;
        string  symbol;
        bool    initialized;
    }

    /// @dev mintId => Mint
    mapping(bytes32 => Mint) public mints;
    bytes32[] public allMints;

    /// @dev mintId => holder => balance
    mapping(bytes32 => mapping(address => uint256)) public balanceOf;
    /// @dev mintId => holder => spender => allowance
    mapping(bytes32 => mapping(address => mapping(address => uint256))) public allowance;
    /// @dev mintId => holder => frozen?
    mapping(bytes32 => mapping(address => bool)) public frozen;

    event MintCreated(bytes32 indexed mintId, string symbol, address indexed mintAuthority);
    event Transfer(bytes32 indexed mintId, address indexed from, address indexed to, uint256 amount);
    event Approval(bytes32 indexed mintId, address indexed owner, address indexed spender, uint256 amount);
    event Minted(bytes32 indexed mintId, address indexed to, uint256 amount);
    event Burned(bytes32 indexed mintId, address indexed from, uint256 amount);
    event Frozen(bytes32 indexed mintId, address indexed account, bool frozenStatus);
    event AuthorityChanged(bytes32 indexed mintId, bytes32 kind, address prev, address next);

    error AlreadyInitialized();
    error NotMintAuthority();
    error NotFreezeAuthority();
    error MintNotFound();
    error AccountFrozen();
    error InsufficientBalance();
    error InsufficientAllowance();
    error InvalidParams();

    constructor(address systemAddress) {
        system = systemAddress;
    }

    // ─── Mint creation ───────────────────────────────────────────────────────

    function createMint(
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        address mintAuthority,
        address freezeAuthority,
        bytes32 salt
    ) external returns (bytes32 mintId) {
        if (bytes(symbol).length == 0 || mintAuthority == address(0)) revert InvalidParams();
        mintId = keccak256(abi.encodePacked(msg.sender, symbol, salt));
        Mint storage m = mints[mintId];
        if (m.initialized) revert AlreadyInitialized();
        m.name = name;
        m.symbol = symbol;
        m.decimals = decimals;
        m.mintAuthority = mintAuthority;
        m.freezeAuthority = freezeAuthority;
        m.initialized = true;
        allMints.push(mintId);
        emit MintCreated(mintId, symbol, mintAuthority);
    }

    function mintCount() external view returns (uint256) {
        return allMints.length;
    }

    // ─── Core token operations ───────────────────────────────────────────────

    function mint(bytes32 mintId, address to, uint256 amount) external {
        Mint storage m = mints[mintId];
        if (!m.initialized) revert MintNotFound();
        if (msg.sender != m.mintAuthority) revert NotMintAuthority();
        if (frozen[mintId][to]) revert AccountFrozen();
        m.supply += amount;
        balanceOf[mintId][to] += amount;
        emit Minted(mintId, to, amount);
        emit Transfer(mintId, address(0), to, amount);
    }

    function burn(bytes32 mintId, uint256 amount) external {
        _burnFrom(mintId, msg.sender, amount);
    }

    function transfer(bytes32 mintId, address to, uint256 amount) external returns (bool) {
        _transfer(mintId, msg.sender, to, amount);
        return true;
    }

    function approve(bytes32 mintId, address spender, uint256 amount) external returns (bool) {
        allowance[mintId][msg.sender][spender] = amount;
        emit Approval(mintId, msg.sender, spender, amount);
        return true;
    }

    function transferFrom(bytes32 mintId, address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[mintId][from][msg.sender];
        if (a < amount) revert InsufficientAllowance();
        if (a != type(uint256).max) {
            allowance[mintId][from][msg.sender] = a - amount;
        }
        _transfer(mintId, from, to, amount);
        return true;
    }

    function _transfer(bytes32 mintId, address from, address to, uint256 amount) internal {
        Mint storage m = mints[mintId];
        if (!m.initialized) revert MintNotFound();
        if (frozen[mintId][from] || frozen[mintId][to]) revert AccountFrozen();
        uint256 bal = balanceOf[mintId][from];
        if (bal < amount) revert InsufficientBalance();
        unchecked { balanceOf[mintId][from] = bal - amount; }
        balanceOf[mintId][to] += amount;
        emit Transfer(mintId, from, to, amount);
    }

    function _burnFrom(bytes32 mintId, address from, uint256 amount) internal {
        Mint storage m = mints[mintId];
        if (!m.initialized) revert MintNotFound();
        uint256 bal = balanceOf[mintId][from];
        if (bal < amount) revert InsufficientBalance();
        unchecked { balanceOf[mintId][from] = bal - amount; }
        m.supply -= amount;
        emit Burned(mintId, from, amount);
        emit Transfer(mintId, from, address(0), amount);
    }

    // ─── Authority operations ────────────────────────────────────────────────

    function freeze(bytes32 mintId, address account, bool isFrozen) external {
        Mint storage m = mints[mintId];
        if (!m.initialized) revert MintNotFound();
        if (msg.sender != m.freezeAuthority) revert NotFreezeAuthority();
        frozen[mintId][account] = isFrozen;
        emit Frozen(mintId, account, isFrozen);
    }

    function setMintAuthority(bytes32 mintId, address next) external {
        Mint storage m = mints[mintId];
        if (msg.sender != m.mintAuthority) revert NotMintAuthority();
        emit AuthorityChanged(mintId, "mint", m.mintAuthority, next);
        m.mintAuthority = next;
    }

    function setFreezeAuthority(bytes32 mintId, address next) external {
        Mint storage m = mints[mintId];
        if (msg.sender != m.freezeAuthority) revert NotFreezeAuthority();
        emit AuthorityChanged(mintId, "freeze", m.freezeAuthority, next);
        m.freezeAuthority = next;
    }
}
