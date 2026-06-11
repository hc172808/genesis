// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IGPLProgram} from "./IGPLProgram.sol";

/// @title GPLAccounts
/// @notice Generic typed-account store. Inspired by Solana's account model:
///         every account has an `owner` program and arbitrary data, and only
///         the owner program may mutate it.
contract GPLAccounts is IGPLProgram {
    bytes32 public constant override programId = keccak256("gpl.accounts.v1");
    uint256 public constant override programVersion = 1_000_000;
    address public immutable override system;

    struct Account {
        address authority;     // user/admin authorized off-program
        address ownerProgram;  // program that may mutate `data`
        bytes32 kind;          // logical type tag (e.g. keccak("token.mint"))
        uint64  lamports;      // optional rent/balance counter
        bytes   data;          // arbitrary serialized state
        bool    exists;
    }

    mapping(bytes32 => Account) private _accounts;

    event AccountCreated(bytes32 indexed key, address indexed owner, bytes32 indexed kind);
    event AccountWritten(bytes32 indexed key, address indexed writer, uint256 dataLen);
    event AccountClosed(bytes32 indexed key, address indexed closer);

    error AlreadyExists();
    error NotFound();
    error NotOwnerProgram();

    constructor(address systemAddress) {
        system = systemAddress;
    }

    /// @notice Deterministic key for `(owner, kind, seed)` triple — like a Solana PDA.
    function deriveKey(address ownerProgram, bytes32 kind, bytes calldata seed)
        public pure returns (bytes32)
    {
        return keccak256(abi.encodePacked(ownerProgram, kind, seed));
    }

    function createAccount(
        bytes32 key,
        address authority,
        bytes32 kind,
        bytes calldata data
    ) external {
        if (_accounts[key].exists) revert AlreadyExists();
        _accounts[key] = Account({
            authority: authority,
            ownerProgram: msg.sender,
            kind: kind,
            lamports: 0,
            data: data,
            exists: true
        });
        emit AccountCreated(key, msg.sender, kind);
    }

    function write(bytes32 key, bytes calldata data) external {
        Account storage a = _accounts[key];
        if (!a.exists) revert NotFound();
        if (a.ownerProgram != msg.sender) revert NotOwnerProgram();
        a.data = data;
        emit AccountWritten(key, msg.sender, data.length);
    }

    function setLamports(bytes32 key, uint64 lamports) external {
        Account storage a = _accounts[key];
        if (!a.exists) revert NotFound();
        if (a.ownerProgram != msg.sender) revert NotOwnerProgram();
        a.lamports = lamports;
    }

    function close(bytes32 key) external {
        Account storage a = _accounts[key];
        if (!a.exists) revert NotFound();
        if (a.ownerProgram != msg.sender) revert NotOwnerProgram();
        delete _accounts[key];
        emit AccountClosed(key, msg.sender);
    }

    function get(bytes32 key) external view returns (Account memory) {
        Account memory a = _accounts[key];
        if (!a.exists) revert NotFound();
        return a;
    }

    function exists(bytes32 key) external view returns (bool) {
        return _accounts[key].exists;
    }
}
