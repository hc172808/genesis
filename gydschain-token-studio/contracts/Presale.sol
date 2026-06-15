// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address,uint256) external returns (bool);
    function transferFrom(address,address,uint256) external returns (bool);
}

contract Presale {
    address public owner;
    IERC20 public immutable saleToken;
    uint256 public immutable softCap;
    uint256 public immutable hardCap;
    uint256 public immutable pricePerToken; // wei of native per 1e18 sale token
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable vestingCliff;
    uint256 public immutable vestingDuration;
    uint256 public totalRaised;
    bool public finalized;

    struct Contribution { uint256 amount; uint256 tokensOwed; uint256 claimed; bool refunded; }
    mapping(address => Contribution) public contributions;
    mapping(address => bool) public whitelist;
    bool public whitelistEnabled;

    event Contributed(address indexed user, uint256 amount, uint256 tokens);
    event Claimed(address indexed user, uint256 amount);
    event Refunded(address indexed user, uint256 amount);

    constructor(
        address _token, uint256 _soft, uint256 _hard, uint256 _price,
        uint256 _start, uint256 _end, uint256 _cliff, uint256 _dur, bool _wl
    ) {
        owner = msg.sender;
        saleToken = IERC20(_token);
        softCap = _soft; hardCap = _hard; pricePerToken = _price;
        startTime = _start; endTime = _end;
        vestingCliff = _cliff; vestingDuration = _dur;
        whitelistEnabled = _wl;
    }

    function setWhitelist(address[] calldata users, bool ok) external {
        require(msg.sender == owner, "owner");
        for (uint256 i = 0; i < users.length; i++) whitelist[users[i]] = ok;
    }

    function contribute() external payable {
        require(block.timestamp >= startTime && block.timestamp <= endTime, "window");
        require(totalRaised + msg.value <= hardCap, "hardcap");
        if (whitelistEnabled) require(whitelist[msg.sender], "not whitelisted");
        uint256 tokens = (msg.value * 1e18) / pricePerToken;
        contributions[msg.sender].amount += msg.value;
        contributions[msg.sender].tokensOwed += tokens;
        totalRaised += msg.value;
        emit Contributed(msg.sender, msg.value, tokens);
    }

    function claim() external {
        require(block.timestamp > endTime, "live");
        require(totalRaised >= softCap, "softcap not met");
        Contribution storage c = contributions[msg.sender];
        require(c.tokensOwed > 0, "none");
        uint256 vested = _vested(c.tokensOwed);
        uint256 claimable = vested - c.claimed;
        require(claimable > 0, "0 claimable");
        c.claimed += claimable;
        require(saleToken.transfer(msg.sender, claimable), "transfer");
        emit Claimed(msg.sender, claimable);
    }

    function refund() external {
        require(block.timestamp > endTime, "live");
        require(totalRaised < softCap, "succeeded");
        Contribution storage c = contributions[msg.sender];
        require(c.amount > 0 && !c.refunded, "none");
        uint256 amt = c.amount; c.refunded = true; c.amount = 0;
        (bool ok,) = msg.sender.call{value: amt}(""); require(ok, "send");
        emit Refunded(msg.sender, amt);
    }

    function _vested(uint256 total) internal view returns (uint256) {
        uint256 ts = block.timestamp;
        if (ts < endTime + vestingCliff) return 0;
        if (vestingDuration == 0 || ts >= endTime + vestingCliff + vestingDuration) return total;
        return (total * (ts - endTime - vestingCliff)) / vestingDuration;
    }

    function withdrawRaised() external {
        require(msg.sender == owner && block.timestamp > endTime && totalRaised >= softCap, "no");
        (bool ok,) = owner.call{value: address(this).balance}(""); require(ok, "send");
    }
}
