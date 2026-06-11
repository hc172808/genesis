// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IERC20Minimal {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
}

interface IFactory {
    function feeTo() external view returns (address);
}

/// @notice Minimal Uniswap V2 CPMM pair. 0.30 % swap fee, 84/16 LP/protocol split.
contract UniswapV2Pair {
    string public constant name = "Gyds LP Token";
    string public constant symbol = "GYDS-LP";
    uint8  public constant decimals = 18;

    uint256 public constant MINIMUM_LIQUIDITY = 1e3;

    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32  private blockTimestampLast;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 private unlocked = 1;
    modifier lock() { require(unlocked == 1, "LOCKED"); unlocked = 0; _; unlocked = 1; }

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(address indexed sender, uint256 a0In, uint256 a1In, uint256 a0Out, uint256 a1Out, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() { factory = msg.sender; }

    function initialize(address _t0, address _t1) external {
        require(msg.sender == factory, "FORBIDDEN");
        token0 = _t0; token1 = _t1;
    }

    function getReserves() public view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    // ─── LP ERC-20 ────────────────────────────────────────────
    function approve(address s, uint256 v) external returns (bool) { allowance[msg.sender][s] = v; emit Approval(msg.sender, s, v); return true; }
    function transfer(address to, uint256 v) external returns (bool) { _transfer(msg.sender, to, v); return true; }
    function transferFrom(address from, address to, uint256 v) external returns (bool) {
        if (allowance[from][msg.sender] != type(uint256).max) {
            require(allowance[from][msg.sender] >= v, "ALLOWANCE");
            allowance[from][msg.sender] -= v;
        }
        _transfer(from, to, v);
        return true;
    }
    function _transfer(address from, address to, uint256 v) private {
        require(balanceOf[from] >= v, "BAL");
        balanceOf[from] -= v; balanceOf[to] += v;
        emit Transfer(from, to, v);
    }
    function _mint(address to, uint256 v) private { totalSupply += v; balanceOf[to] += v; emit Transfer(address(0), to, v); }
    function _burn(address from, uint256 v) private { balanceOf[from] -= v; totalSupply -= v; emit Transfer(from, address(0), v); }

    // ─── core ─────────────────────────────────────────────────
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) { z = y; uint256 x = y / 2 + 1; while (x < z) { z = x; x = (y / x + x) / 2; } }
        else if (y != 0) { z = 1; }
    }

    function _update(uint256 b0, uint256 b1) private {
        require(b0 <= type(uint112).max && b1 <= type(uint112).max, "OVERFLOW");
        reserve0 = uint112(b0); reserve1 = uint112(b1);
        blockTimestampLast = uint32(block.timestamp);
        emit Sync(reserve0, reserve1);
    }

    /// Protocol fee — 16 % of LP fee (i.e. 16% of newly-minted-LP-for-fees).
    function _mintFee(uint112 r0, uint112 r1) private returns (bool feeOn) {
        address feeTo = IFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        if (feeOn && r0 != 0 && r1 != 0) {
            uint256 rootK = _sqrt(uint256(r0) * uint256(r1));
            // simplified: mint LP tokens representing 16% of growth since last mint
            uint256 supply = totalSupply;
            if (supply > 0) {
                uint256 numerator = supply * (rootK - _sqrt(uint256(reserve0) * uint256(reserve1))) * 16;
                uint256 denominator = rootK * 100;
                if (denominator > 0) {
                    uint256 liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        }
    }

    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 r0, uint112 r1, ) = getReserves();
        uint256 b0 = IERC20Minimal(token0).balanceOf(address(this));
        uint256 b1 = IERC20Minimal(token1).balanceOf(address(this));
        uint256 a0 = b0 - r0;
        uint256 a1 = b1 - r1;

        _mintFee(r0, r1);
        uint256 supply = totalSupply;
        if (supply == 0) {
            liquidity = _sqrt(a0 * a1) - MINIMUM_LIQUIDITY;
            _mint(address(0xdead), MINIMUM_LIQUIDITY);
        } else {
            liquidity = _min((a0 * supply) / r0, (a1 * supply) / r1);
        }
        require(liquidity > 0, "INSUFFICIENT_LIQ_MINTED");
        _mint(to, liquidity);
        _update(b0, b1);
        emit Mint(msg.sender, a0, a1);
    }

    function burn(address to) external lock returns (uint256 a0, uint256 a1) {
        (uint112 r0, uint112 r1, ) = getReserves();
        uint256 liquidity = balanceOf[address(this)];
        uint256 b0 = IERC20Minimal(token0).balanceOf(address(this));
        uint256 b1 = IERC20Minimal(token1).balanceOf(address(this));

        _mintFee(r0, r1);
        uint256 supply = totalSupply;
        a0 = (liquidity * b0) / supply;
        a1 = (liquidity * b1) / supply;
        require(a0 > 0 && a1 > 0, "INSUFFICIENT_LIQ_BURNED");
        _burn(address(this), liquidity);
        IERC20Minimal(token0).transfer(to, a0);
        IERC20Minimal(token1).transfer(to, a1);
        _update(IERC20Minimal(token0).balanceOf(address(this)), IERC20Minimal(token1).balanceOf(address(this)));
        emit Burn(msg.sender, a0, a1, to);
    }

    function swap(uint256 a0Out, uint256 a1Out, address to) external lock {
        require(a0Out > 0 || a1Out > 0, "INSUFFICIENT_OUTPUT");
        (uint112 r0, uint112 r1, ) = getReserves();
        require(a0Out < r0 && a1Out < r1, "INSUFFICIENT_LIQUIDITY");

        if (a0Out > 0) IERC20Minimal(token0).transfer(to, a0Out);
        if (a1Out > 0) IERC20Minimal(token1).transfer(to, a1Out);
        uint256 b0 = IERC20Minimal(token0).balanceOf(address(this));
        uint256 b1 = IERC20Minimal(token1).balanceOf(address(this));
        uint256 a0In = b0 > r0 - a0Out ? b0 - (r0 - a0Out) : 0;
        uint256 a1In = b1 > r1 - a1Out ? b1 - (r1 - a1Out) : 0;
        require(a0In > 0 || a1In > 0, "INSUFFICIENT_INPUT");

        // 0.30 % fee — adjusted reserves (* 1000 then subtract 3*amountIn)
        uint256 b0Adj = b0 * 1000 - a0In * 3;
        uint256 b1Adj = b1 * 1000 - a1In * 3;
        require(b0Adj * b1Adj >= uint256(r0) * uint256(r1) * 1_000_000, "K");

        _update(b0, b1);
        emit Swap(msg.sender, a0In, a1In, a0Out, a1Out, to);
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) { return x < y ? x : y; }
}
