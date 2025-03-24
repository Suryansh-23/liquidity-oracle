// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IOracleServiceManager {
    function createNewTask(
        bytes32 poolId,
        int24 tickLower,
        int24 tickUpper,
        int24 localRangeOffset,
        int24 activeTick,
        int24 tickSpacing,
        int256[] memory
    ) external;
}
