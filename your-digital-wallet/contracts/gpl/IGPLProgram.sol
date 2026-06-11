// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IGPLProgram
/// @notice Base interface every GPL program implements. Inspired by Solana's
///         program model where each program has a stable id and is invoked by
///         other programs through cross-program invocations.
interface IGPLProgram {
    /// @notice Stable, human-readable identifier (e.g. "token", "staking").
    function programId() external view returns (bytes32);

    /// @notice Semantic version (major * 1e6 + minor * 1e3 + patch).
    function programVersion() external view returns (uint256);

    /// @notice Address of the GPLSystem registry this program is bound to.
    function system() external view returns (address);
}
