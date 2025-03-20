// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IServiceManager {
    function createNewTask(
        bytes32 poolId,
        int24 tickLower,
        int24 tickUpper,
        int24 tickSpacing,
        uint256[] memory
    ) external;
}
