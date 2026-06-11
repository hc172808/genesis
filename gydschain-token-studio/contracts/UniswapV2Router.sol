// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
}

interface IWGYDS is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}

interface IUniswapV2Factory {
    function getPair(address, address) external view returns (address);
    function createPair(address, address) external returns (address);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112, uint112, uint32);
    function mint(address) external returns (uint256);
    function burn(address) external returns (uint256, uint256);
    function swap(uint256, uint256, address) external;
    function token0() external view returns (address);
}

/// @notice Minimal Uniswap V2 router. Handles native↔ERC-20 swaps via WGYDS.
contract UniswapV2Router {
    address public immutable factory;
    address public immutable WGYDS;

    modifier ensure(uint256 deadline) { require(block.timestamp <= deadline, "EXPIRED"); _; }

    constructor(address _factory, address _wgyds) { factory = _factory; WGYDS = _wgyds; }

    receive() external payable { require(msg.sender == WGYDS, "ONLY_WGYDS"); }

    // ─── helpers ─────────────────────────────────────────────
    function _sort(address a, address b) internal pure returns (address, address) {
        return a < b ? (a, b) : (b, a);
    }

    function _pairFor(address tA, address tB) internal view returns (address pair) {
        pair = IUniswapV2Factory(factory).getPair(tA, tB);
    }

    function quote(uint256 amountA, uint256 rA, uint256 rB) public pure returns (uint256) {
        require(amountA > 0 && rA > 0 && rB > 0, "INSUFFICIENT");
        return (amountA * rB) / rA;
    }

    function getAmountOut(uint256 amountIn, uint256 rIn, uint256 rOut) public pure returns (uint256) {
        require(amountIn > 0 && rIn > 0 && rOut > 0, "INSUFFICIENT");
        uint256 amountInWithFee = amountIn * 997;
        return (amountInWithFee * rOut) / (rIn * 1000 + amountInWithFee);
    }

    function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; ++i) {
            (uint112 r0, uint112 r1, ) = IUniswapV2Pair(_pairFor(path[i], path[i + 1])).getReserves();
            (address t0, ) = _sort(path[i], path[i + 1]);
            (uint256 rIn, uint256 rOut) = path[i] == t0 ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
            amounts[i + 1] = getAmountOut(amounts[i], rIn, rOut);
        }
    }

    // ─── add liquidity ────────────────────────────────────────
    function _addLiquidity(
        address tA, address tB,
        uint256 aDes, uint256 bDes, uint256 aMin, uint256 bMin
    ) internal returns (uint256 a, uint256 b) {
        if (IUniswapV2Factory(factory).getPair(tA, tB) == address(0)) IUniswapV2Factory(factory).createPair(tA, tB);
        address pair = _pairFor(tA, tB);
        (uint112 r0, uint112 r1, ) = IUniswapV2Pair(pair).getReserves();
        (address t0, ) = _sort(tA, tB);
        (uint256 rA, uint256 rB) = tA == t0 ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
        if (rA == 0 && rB == 0) { (a, b) = (aDes, bDes); }
        else {
            uint256 bOpt = quote(aDes, rA, rB);
            if (bOpt <= bDes) { require(bOpt >= bMin, "B_MIN"); (a, b) = (aDes, bOpt); }
            else {
                uint256 aOpt = quote(bDes, rB, rA);
                require(aOpt <= aDes && aOpt >= aMin, "A_MIN");
                (a, b) = (aOpt, bDes);
            }
        }
    }

    function addLiquidity(
        address tA, address tB,
        uint256 aDes, uint256 bDes, uint256 aMin, uint256 bMin,
        address to, uint256 deadline
    ) external ensure(deadline) returns (uint256 a, uint256 b, uint256 liq) {
        (a, b) = _addLiquidity(tA, tB, aDes, bDes, aMin, bMin);
        address pair = _pairFor(tA, tB);
        IERC20(tA).transferFrom(msg.sender, pair, a);
        IERC20(tB).transferFrom(msg.sender, pair, b);
        liq = IUniswapV2Pair(pair).mint(to);
    }

    function addLiquidityETH(
        address token, uint256 tDes, uint256 tMin, uint256 ethMin,
        address to, uint256 deadline
    ) external payable ensure(deadline) returns (uint256 a, uint256 b, uint256 liq) {
        (a, b) = _addLiquidity(token, WGYDS, tDes, msg.value, tMin, ethMin);
        address pair = _pairFor(token, WGYDS);
        IERC20(token).transferFrom(msg.sender, pair, a);
        IWGYDS(WGYDS).deposit{value: b}();
        IWGYDS(WGYDS).transfer(pair, b);
        liq = IUniswapV2Pair(pair).mint(to);
        if (msg.value > b) {
            (bool ok, ) = msg.sender.call{value: msg.value - b}("");
            require(ok, "REFUND");
        }
    }

    // ─── remove liquidity ─────────────────────────────────────
    function removeLiquidity(
        address tA, address tB, uint256 liq, uint256 aMin, uint256 bMin,
        address to, uint256 deadline
    ) public ensure(deadline) returns (uint256 a, uint256 b) {
        address pair = _pairFor(tA, tB);
        IERC20(pair).transferFrom(msg.sender, pair, liq);
        (uint256 a0, uint256 a1) = IUniswapV2Pair(pair).burn(to);
        (address t0, ) = _sort(tA, tB);
        (a, b) = tA == t0 ? (a0, a1) : (a1, a0);
        require(a >= aMin, "A_MIN");
        require(b >= bMin, "B_MIN");
    }

    function removeLiquidityETH(
        address token, uint256 liq, uint256 tMin, uint256 ethMin,
        address to, uint256 deadline
    ) external ensure(deadline) returns (uint256 a, uint256 b) {
        (a, b) = removeLiquidity(token, WGYDS, liq, tMin, ethMin, address(this), deadline);
        IERC20(token).transfer(to, a);
        IWGYDS(WGYDS).withdraw(b);
        (bool ok, ) = to.call{value: b}("");
        require(ok, "ETH");
    }

    // ─── swaps ────────────────────────────────────────────────
    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; ++i) {
            (address t0, ) = _sort(path[i], path[i + 1]);
            uint256 aOut = amounts[i + 1];
            (uint256 a0Out, uint256 a1Out) = path[i] == t0 ? (uint256(0), aOut) : (aOut, uint256(0));
            address to = i < path.length - 2 ? _pairFor(path[i + 1], path[i + 2]) : _to;
            IUniswapV2Pair(_pairFor(path[i], path[i + 1])).swap(a0Out, a1Out, to);
        }
    }

    function swapExactTokensForTokens(
        uint256 amountIn, uint256 amountOutMin, address[] calldata path,
        address to, uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "OUT_MIN");
        IERC20(path[0]).transferFrom(msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapExactETHForTokens(
        uint256 amountOutMin, address[] calldata path, address to, uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == WGYDS, "PATH");
        amounts = getAmountsOut(msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "OUT_MIN");
        IWGYDS(WGYDS).deposit{value: amounts[0]}();
        IWGYDS(WGYDS).transfer(_pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapExactTokensForETH(
        uint256 amountIn, uint256 amountOutMin, address[] calldata path,
        address to, uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == WGYDS, "PATH");
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "OUT_MIN");
        IERC20(path[0]).transferFrom(msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWGYDS(WGYDS).withdraw(amounts[amounts.length - 1]);
        (bool ok, ) = to.call{value: amounts[amounts.length - 1]}("");
        require(ok, "ETH");
    }
}
