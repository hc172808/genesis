// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IGPLProgram} from "./IGPLProgram.sol";
import {GPLToken} from "./GPLToken.sol";

/// @title GPLStaking
/// @notice Staking module for the GYDS Program Library. Users lock a GYDS-20
///         token (the "stake mint") into a pool and accrue rewards in another
///         GYDS-20 token (the "reward mint"), distributed at a fixed
///         emission rate per second using the standard `accRewardPerShare`
///         pattern.
contract GPLStaking is IGPLProgram {
    bytes32 public constant override programId = keccak256("gpl.staking.v1");
    uint256 public constant override programVersion = 1_000_000;
    address public immutable override system;

    GPLToken public immutable token;

    struct Pool {
        bytes32 stakeMint;
        bytes32 rewardMint;
        uint256 rewardPerSecond;     // emission rate
        uint256 totalStaked;
        uint256 accRewardPerShare;   // 1e18 scaled
        uint64  lastUpdate;
        address admin;
        bool    initialized;
    }

    struct Stake {
        uint256 amount;
        uint256 rewardDebt;          // 1e18 scaled
    }

    /// @dev poolId => Pool
    mapping(bytes32 => Pool) public pools;
    bytes32[] public allPools;

    /// @dev poolId => user => Stake
    mapping(bytes32 => mapping(address => Stake)) public stakes;

    uint256 private constant ACC_PRECISION = 1e18;

    event PoolCreated(bytes32 indexed poolId, bytes32 stakeMint, bytes32 rewardMint, uint256 rewardPerSecond);
    event Staked(bytes32 indexed poolId, address indexed user, uint256 amount);
    event Unstaked(bytes32 indexed poolId, address indexed user, uint256 amount);
    event Claimed(bytes32 indexed poolId, address indexed user, uint256 reward);
    event RateUpdated(bytes32 indexed poolId, uint256 rewardPerSecond);

    error PoolExists();
    error PoolNotFound();
    error NotAdmin();
    error ZeroAmount();
    error InsufficientStake();

    constructor(address systemAddress, address tokenAddress) {
        system = systemAddress;
        token = GPLToken(tokenAddress);
    }

    function createPool(
        bytes32 stakeMint,
        bytes32 rewardMint,
        uint256 rewardPerSecond,
        bytes32 salt
    ) external returns (bytes32 poolId) {
        poolId = keccak256(abi.encodePacked(stakeMint, rewardMint, salt));
        Pool storage p = pools[poolId];
        if (p.initialized) revert PoolExists();
        p.stakeMint = stakeMint;
        p.rewardMint = rewardMint;
        p.rewardPerSecond = rewardPerSecond;
        p.lastUpdate = uint64(block.timestamp);
        p.admin = msg.sender;
        p.initialized = true;
        allPools.push(poolId);
        emit PoolCreated(poolId, stakeMint, rewardMint, rewardPerSecond);
    }

    function poolCount() external view returns (uint256) {
        return allPools.length;
    }

    function setRewardRate(bytes32 poolId, uint256 rewardPerSecond) external {
        Pool storage p = _accrue(poolId);
        if (msg.sender != p.admin) revert NotAdmin();
        p.rewardPerSecond = rewardPerSecond;
        emit RateUpdated(poolId, rewardPerSecond);
    }

    function stake(bytes32 poolId, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        Pool storage p = _accrue(poolId);
        Stake storage s = stakes[poolId][msg.sender];

        // Auto-claim pending before changing principal.
        _claim(p, s, poolId, msg.sender);

        // Pull stake tokens from user (caller must have approved this contract).
        require(
            token.transferFrom(p.stakeMint, msg.sender, address(this), amount),
            "GPL: stake transfer failed"
        );

        s.amount += amount;
        p.totalStaked += amount;
        s.rewardDebt = (s.amount * p.accRewardPerShare) / ACC_PRECISION;
        emit Staked(poolId, msg.sender, amount);
    }

    function unstake(bytes32 poolId, uint256 amount) external {
        Pool storage p = _accrue(poolId);
        Stake storage s = stakes[poolId][msg.sender];
        if (amount == 0) revert ZeroAmount();
        if (s.amount < amount) revert InsufficientStake();

        _claim(p, s, poolId, msg.sender);

        s.amount -= amount;
        p.totalStaked -= amount;
        s.rewardDebt = (s.amount * p.accRewardPerShare) / ACC_PRECISION;

        require(
            token.transfer(p.stakeMint, msg.sender, amount),
            "GPL: unstake transfer failed"
        );
        emit Unstaked(poolId, msg.sender, amount);
    }

    function claim(bytes32 poolId) external {
        Pool storage p = _accrue(poolId);
        Stake storage s = stakes[poolId][msg.sender];
        _claim(p, s, poolId, msg.sender);
        s.rewardDebt = (s.amount * p.accRewardPerShare) / ACC_PRECISION;
    }

    function pending(bytes32 poolId, address user) external view returns (uint256) {
        Pool memory p = pools[poolId];
        if (!p.initialized || p.totalStaked == 0) return 0;
        Stake memory s = stakes[poolId][user];
        uint256 timeDelta = block.timestamp - p.lastUpdate;
        uint256 reward = timeDelta * p.rewardPerSecond;
        uint256 acc = p.accRewardPerShare + (reward * ACC_PRECISION) / p.totalStaked;
        return (s.amount * acc) / ACC_PRECISION - s.rewardDebt;
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _accrue(bytes32 poolId) internal returns (Pool storage p) {
        p = pools[poolId];
        if (!p.initialized) revert PoolNotFound();
        if (block.timestamp <= p.lastUpdate) return p;
        if (p.totalStaked > 0) {
            uint256 timeDelta = block.timestamp - p.lastUpdate;
            uint256 reward = timeDelta * p.rewardPerSecond;
            p.accRewardPerShare += (reward * ACC_PRECISION) / p.totalStaked;
        }
        p.lastUpdate = uint64(block.timestamp);
    }

    function _claim(Pool storage p, Stake storage s, bytes32 poolId, address user) internal {
        if (s.amount == 0) return;
        uint256 owed = (s.amount * p.accRewardPerShare) / ACC_PRECISION - s.rewardDebt;
        if (owed == 0) return;
        // Mint rewards directly — staking program must be the rewardMint's mintAuthority.
        token.mint(p.rewardMint, user, owed);
        emit Claimed(poolId, user, owed);
    }
}
