// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IOracleHook {
    struct PoolMetrics {
        uint256 liqTransition;
        uint256 volatility;
        uint256 liqTimeToLive;
        uint256 depth;
        uint256 spread;
        uint256 liqConcentration;
    }

    function updatePoolMetrics(
        bytes32 key,
        PoolMetrics memory poolMetrics
    ) external;
}
