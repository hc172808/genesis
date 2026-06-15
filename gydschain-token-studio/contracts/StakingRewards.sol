// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Minimal Synthetix-style staking with a constant reward rate.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

contract StakingRewards {
    address public owner;
    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;
    uint256 public rewardRate;            // tokens per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(address _staking, address _reward, uint256 _rate) {
        owner = msg.sender;
        stakingToken = IERC20(_staking);
        rewardToken = IERC20(_reward);
        rewardRate = _rate;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + ((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return (balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }

    function stake(uint256 amount) external updateReward(msg.sender) {
        require(amount > 0, "zero");
        totalSupply += amount;
        balanceOf[msg.sender] += amount;
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "transfer");
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0 && balanceOf[msg.sender] >= amount, "bal");
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        require(stakingToken.transfer(msg.sender, amount), "transfer");
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public updateReward(msg.sender) {
        uint256 r = rewards[msg.sender];
        if (r > 0) {
            rewards[msg.sender] = 0;
            require(rewardToken.transfer(msg.sender, r), "transfer");
            emit RewardPaid(msg.sender, r);
        }
    }

    function exit() external { withdraw(balanceOf[msg.sender]); getReward(); }

    function setRewardRate(uint256 _rate) external updateReward(address(0)) {
        require(msg.sender == owner, "owner");
        rewardRate = _rate;
    }
}
