// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "./UniswapV2Pair.sol";

/// @notice Minimal Uniswap V2 factory. Deploys new CPMM pair contracts.
contract UniswapV2Factory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed t0, address indexed t1, address pair, uint256);

    constructor(address _feeToSetter) { feeToSetter = _feeToSetter; }

    function allPairsLength() external view returns (uint256) { return allPairs.length; }

    function createPair(address a, address b) external returns (address pair) {
        require(a != b, "IDENTICAL");
        (address t0, address t1) = a < b ? (a, b) : (b, a);
        require(t0 != address(0), "ZERO");
        require(getPair[t0][t1] == address(0), "EXISTS");

        bytes32 salt = keccak256(abi.encodePacked(t0, t1));
        UniswapV2Pair newPair = new UniswapV2Pair{salt: salt}();
        newPair.initialize(t0, t1);
        pair = address(newPair);

        getPair[t0][t1] = pair;
        getPair[t1][t0] = pair;
        allPairs.push(pair);
        emit PairCreated(t0, t1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external { require(msg.sender == feeToSetter, "FORBIDDEN"); feeTo = _feeTo; }
    function setFeeToSetter(address _x) external { require(msg.sender == feeToSetter, "FORBIDDEN"); feeToSetter = _x; }
}
