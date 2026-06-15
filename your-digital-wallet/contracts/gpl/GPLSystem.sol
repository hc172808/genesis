// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IGPLProgram} from "./IGPLProgram.sol";

/// @title GPLSystem
/// @notice The GPL System Program. Mirrors Solana's System Program: it tracks
///         the program registry, handles native GYDS transfers, and owns the
///         upgrade authority for the rest of the GPL suite.
contract GPLSystem {
    bytes32 public constant PROGRAM_ID = keccak256("gpl.system.v1");
    uint256 public constant PROGRAM_VERSION = 1_000_000;

    address public owner;

    /// @dev programId => current implementation address.
    mapping(bytes32 => address) private _programs;
    /// @dev iteration helper.
    bytes32[] private _programIds;

    event ProgramRegistered(bytes32 indexed programId, address indexed impl);
    event ProgramUpgraded(bytes32 indexed programId, address indexed prev, address indexed next);
    event NativeTransfer(address indexed from, address indexed to, uint256 amount);
    event OwnerChanged(address indexed prev, address indexed next);

    error NotOwner();
    error ProgramNotFound();
    error InvalidAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Registry ────────────────────────────────────────────────────────────

    function registerProgram(bytes32 id, address impl) external onlyOwner {
        if (impl == address(0)) revert InvalidAddress();
        address prev = _programs[id];
        _programs[id] = impl;
        if (prev == address(0)) {
            _programIds.push(id);
            emit ProgramRegistered(id, impl);
        } else {
            emit ProgramUpgraded(id, prev, impl);
        }
    }

    function getProgram(bytes32 id) external view returns (address impl) {
        impl = _programs[id];
        if (impl == address(0)) revert ProgramNotFound();
    }

    function programCount() external view returns (uint256) {
        return _programIds.length;
    }

    function programIdAt(uint256 i) external view returns (bytes32) {
        return _programIds[i];
    }

    // ─── Native transfers ────────────────────────────────────────────────────

    /// @notice Transfer native GYDS in a single, auditable call.
    function transfer(address to) external payable {
        if (to == address(0)) revert InvalidAddress();
        (bool ok, ) = to.call{value: msg.value}("");
        require(ok, "GPL: native transfer failed");
        emit NativeTransfer(msg.sender, to, msg.value);
    }

    // ─── Ownership ───────────────────────────────────────────────────────────

    function setOwner(address next) external onlyOwner {
        if (next == address(0)) revert InvalidAddress();
        emit OwnerChanged(owner, next);
        owner = next;
    }
}
