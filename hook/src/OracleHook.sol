// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {console} from "forge-std/console.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SignedMath} from "@openzeppelin/contracts/utils/math/SignedMath.sol";

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";

import {IOracleServiceManager} from "./IOracleServiceManager.sol";

contract OracleHook is BaseHook, Ownable {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    using SignedMath for int256;

    error OracleHook__NotAuthorized();
    error OracleHook__DataNotAvailable();

    event PoolMetricsUpdated(PoolMetrics poolMetrics);

    struct PoolMetrics {
        uint256 liqTransition;
        uint256 volatility;
        uint256 depth;
        uint256 spread;
        uint256 liqConcentration;
    }

    struct PoolSnapshot {
        int24 lastActiveTick;
        int256 totalLiquidity;
        uint256 lastSnapshotTotalLiquidity;
        uint256 cumulativeLiquidityDelta;
        uint256 lastUpdateTimestamp;
    }

    uint256 constant PRECISION = 1e18;
    uint256 constant TICK_SHIFT_THRESHOLD = 5; // 5 Tick shift
    uint256 constant LIQUIDITY_THRESHOLD = 5e16; // 5% liquidity change
    uint256 constant TIME_THRESHOLD = 10 seconds;

    address public serviceManager;

    mapping(PoolId poolId => PoolMetrics) public poolMetrics;
    mapping(PoolId poolId => PoolSnapshot) public snapshots;

    constructor(
        IPoolManager _poolManager,
        address _owner
    ) BaseHook(_poolManager) Ownable(_owner) {}

    /**
     * @notice sets the service manager address
     * @dev only the owner can call this function
     * @param _serviceManager the service manager address
     */
    function setServiceManager(address _serviceManager) external onlyOwner {
        serviceManager = _serviceManager;
    }

    /**
     * @notice updates the pool metrics
     * @dev only the service manager can call this function
     * @param _poolId the pool id
     * @param _poolMetrics the pool metrics
     */
    function updatePoolMetrics(
        bytes32 _poolId,
        PoolMetrics memory _poolMetrics
    ) external {
        console.log("updatePoolMetrics");
        if (msg.sender != serviceManager) revert OracleHook__NotAuthorized();
        poolMetrics[PoolId.wrap(_poolId)] = _poolMetrics;

        emit PoolMetricsUpdated(_poolMetrics);
    }

    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: true,
                beforeAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterAddLiquidity: true,
                afterRemoveLiquidity: true,
                beforeSwap: false,
                afterSwap: true,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }

    function _afterInitialize(
        address,
        PoolKey calldata key,
        uint160,
        int24 tick
    ) internal override returns (bytes4) {
        snapshots[key.toId()] = PoolSnapshot({
            lastActiveTick: tick,
            totalLiquidity: 0,
            lastSnapshotTotalLiquidity: 0,
            cumulativeLiquidityDelta: 0,
            lastUpdateTimestamp: block.timestamp
        });

        return this.afterInitialize.selector;
    }

    function _afterAddLiquidity(
        address,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, BalanceDelta) {
        _afterModifyLiquidity(key, params);

        return (this.afterAddLiquidity.selector, delta);
    }

    function _afterRemoveLiquidity(
        address,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, BalanceDelta) {
        _afterModifyLiquidity(key, params);

        return (this.afterRemoveLiquidity.selector, delta);
    }

    /// @dev updates the pool snapshot after a liquidity modification
    function _afterModifyLiquidity(
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params
    ) internal {
        PoolSnapshot memory snapshot = snapshots[key.toId()];

        snapshot.totalLiquidity += params.liquidityDelta;
        snapshot.cumulativeLiquidityDelta += params.liquidityDelta.abs();

        snapshots[key.toId()] = snapshot;

        if (_isThresholdReached(key)) {
            snapshots[key.toId()].lastSnapshotTotalLiquidity = uint256(
                snapshot.totalLiquidity
            );
            _triggerAVSComputation(key);
        }
    }

    function _afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        if (_isThresholdReached(key)) _triggerAVSComputation(key);

        return (this.afterSwap.selector, 0);
    }

    /**
     * @dev triggers the AVS computation for the given pool and updates the snapshot parameters
     * @param key the pool key
     */
    function _triggerAVSComputation(PoolKey memory key) internal {
        PoolId poolId = key.toId();
        PoolSnapshot memory snapshot = snapshots[poolId];

        int24 activeTick = _getActiveTick(poolId);

        snapshot.lastActiveTick = activeTick;
        snapshot.lastUpdateTimestamp = block.timestamp;
        snapshot.cumulativeLiquidityDelta = 0;

        snapshots[poolId] = snapshot;

        IOracleServiceManager(serviceManager).createNewTask(
            PoolId.unwrap(poolId),
            activeTick,
            key.tickSpacing
        );
    }

    /// @notice returns the liquidity transition metric value for the pool
    function getLiquidityTransition(
        PoolId poolId
    ) external view returns (uint256 liqTransition) {
        liqTransition = poolMetrics[poolId].liqTransition;
        if (liqTransition == 0) revert OracleHook__DataNotAvailable();
    }

    /// @notice returns the volatility of a pool
    function getVolatility(
        PoolId poolId
    ) external view returns (uint256 volatility) {
        volatility = poolMetrics[poolId].volatility;
        if (volatility == 0) revert OracleHook__DataNotAvailable();
    }

    /// @notice returns the depth of a pool
    function getDepth(PoolId poolId) external view returns (uint256 depth) {
        depth = poolMetrics[poolId].depth;
        if (depth == 0) revert OracleHook__DataNotAvailable();
    }

    /// @notice returns the spread of a pool
    function getSpread(PoolId poolId) external view returns (uint256 spread) {
        spread = poolMetrics[poolId].spread;
        if (spread == 0) revert OracleHook__DataNotAvailable();
    }

    /// @notice returns the liquidity concentration of a pool
    function getLiquidityConcentration(
        PoolId poolId
    ) external view returns (uint256 liqConcentration) {
        liqConcentration = poolMetrics[poolId].liqConcentration;
        if (liqConcentration == 0) revert OracleHook__DataNotAvailable();
    }

    /// @dev checks if the threshold is reached to trigger the AVS computation
    function _isThresholdReached(
        PoolKey calldata key
    ) internal view returns (bool) {
        PoolSnapshot memory snapshot = snapshots[key.toId()];

        int24 activeTick = _getActiveTick(key.toId());

        if (block.timestamp > snapshot.lastUpdateTimestamp + TIME_THRESHOLD)
            return true;

        if (
            int256(activeTick - snapshot.lastActiveTick).abs() >
            TICK_SHIFT_THRESHOLD
        ) return true;

        if (snapshot.lastSnapshotTotalLiquidity == 0) return true;
        else if (
            (snapshot.cumulativeLiquidityDelta * PRECISION) /
                snapshot.lastSnapshotTotalLiquidity >
            LIQUIDITY_THRESHOLD
        ) return true;

        return false;
    }

    /// @dev gets the current active tick for a pool
    function _getActiveTick(
        PoolId poolId
    ) internal view returns (int24 activeTick) {
        (, activeTick, , ) = poolManager.getSlot0(poolId);
    }
}
