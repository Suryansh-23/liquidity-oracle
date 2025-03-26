// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

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

    struct PoolMetrics {
        uint256 liqTransition;
        uint256 volatility;
        uint256 liqTimeToLive;
        uint256 depth;
        uint256 spread;
        uint256 liqConcentration;
    }

    struct LocalRangeParams {
        int24 tickLower;
        int24 tickUpper;
        int24 lastActiveTick;
        int256 totalLiquidity;
        int256 lastSnapshotTotalLiquidity;
        uint256 lastUpdateTimestamp;
    }

    // TODO: change config

    uint256 constant BPS = 10_000;
    uint256 constant TICK_SHIFT_THRESHOLD = 100;
    uint256 constant LIQUIDITY_THRESHOLD = 100;
    uint256 constant TIME_THRESHOLD = 5 minutes;
    int24 constant TICK_RANGE_OFFSET = 1_000;

    address public serviceManager;

    mapping(PoolId poolId => mapping(int24 => int256)) public tickLiquidities;
    mapping(PoolId poolId => PoolMetrics) public poolMetrics;
    mapping(PoolId poolId => LocalRangeParams) public localRanges;

    constructor(
        IPoolManager _poolManager
    ) BaseHook(_poolManager) Ownable(msg.sender) {}

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
        if (msg.sender != serviceManager) revert OracleHook__NotAuthorized();
        poolMetrics[PoolId.wrap(_poolId)] = _poolMetrics;
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
        int24 tickSpacing = key.tickSpacing;

        int24 tickLower = ((tick - TICK_RANGE_OFFSET) / tickSpacing) *
            tickSpacing;
        int24 tickUpper = ((tick + TICK_RANGE_OFFSET) / tickSpacing) *
            tickSpacing;

        if (tickLower < TickMath.MIN_TICK)
            tickLower = (TickMath.MIN_TICK / tickSpacing) * tickSpacing;
        if (tickUpper > TickMath.MAX_TICK)
            tickUpper = (TickMath.MAX_TICK / tickSpacing) * tickSpacing;

        localRanges[key.toId()] = LocalRangeParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            lastActiveTick: tick,
            totalLiquidity: 0,
            lastSnapshotTotalLiquidity: 0,
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

    /// @dev updates the local range parameters after a liquidity modification
    function _afterModifyLiquidity(
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params
    ) internal {
        LocalRangeParams memory localRange = localRanges[key.toId()];
        int24 tickLower = params.tickLower < localRange.tickLower
            ? localRange.tickLower
            : params.tickLower;
        int24 tickUpper = params.tickUpper > localRange.tickUpper
            ? localRange.tickUpper
            : params.tickUpper;

        _updateLocalRangeLiquidity(key, tickLower, tickUpper);
        if (_isThresholdReached(key)) {
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
        LocalRangeParams memory localRange = localRanges[key.toId()];

        _updateLocalRangeLiquidity(
            key,
            localRange.tickLower,
            localRange.tickUpper
        );

        bool triggerAVSComputation = _isThresholdReached(key);

        int24 activeTick = _getActiveTick(key.toId());

        if (
            (activeTick / key.tickSpacing) * key.tickSpacing !=
            (localRange.lastActiveTick / key.tickSpacing) * key.tickSpacing
        ) {
            int24 tickLower = ((activeTick - TICK_RANGE_OFFSET) /
                key.tickSpacing) * key.tickSpacing;
            int24 tickUpper = ((activeTick + TICK_RANGE_OFFSET) /
                key.tickSpacing) * key.tickSpacing;

            _updateLocalRangeParams(key, tickLower, tickUpper);
        }

        if (triggerAVSComputation) _triggerAVSComputation(key);

        return (this.afterSwap.selector, 0);
    }

    /**
     * @dev triggers the AVS computation for the given pool and updates the snapshot parameters
     * @param key the pool key
     */
    function _triggerAVSComputation(PoolKey memory key) internal {
        PoolId poolId = key.toId();
        LocalRangeParams memory localRange = localRanges[poolId];
        int24 tickLower = localRange.tickLower;
        int24 tickUpper = localRange.tickUpper;

        int24 activeTick = _getActiveTick(poolId);

        localRange.lastActiveTick = activeTick;
        localRange.lastSnapshotTotalLiquidity = localRange.totalLiquidity;
        localRange.lastUpdateTimestamp = block.timestamp;
        localRanges[poolId] = localRange;

        int24 tickSpacing = key.tickSpacing;

        int24 length = (tickUpper - tickLower) / tickSpacing + 1;

        int256[] memory liquidities = new int256[](uint24(length));

        for (int24 i; i < length; ++i) {
            liquidities[uint24(i)] = tickLiquidities[poolId][
                tickLower + i * tickSpacing
            ];
        }

        IOracleServiceManager(serviceManager).createNewTask(
            PoolId.unwrap(poolId),
            tickLower,
            tickUpper,
            TICK_RANGE_OFFSET,
            activeTick,
            key.tickSpacing,
            liquidities
        );
    }

    /**
     * @dev updates the local range parameters
     * @param _key the pool key
     * @param _tickLower the lower tick of the range
     * @param _tickUpper the upper tick of the range
     */
    function _updateLocalRangeParams(
        PoolKey calldata _key,
        int24 _tickLower,
        int24 _tickUpper
    ) internal {
        PoolId poolId = _key.toId();

        LocalRangeParams memory localRange = localRanges[poolId];

        int24 tickLower = localRange.tickLower;
        int24 tickUpper = localRange.tickUpper;

        if (_tickLower > tickLower) {
            _updateLocalRangeLiquidity(_key, tickUpper, _tickUpper);
            localRange.totalLiquidity -= _removeTickLiquidities(
                _key,
                tickLower,
                _tickLower
            );
        } else {
            _updateLocalRangeLiquidity(_key, _tickLower, tickLower);
            localRange.totalLiquidity -= _removeTickLiquidities(
                _key,
                _tickUpper,
                tickUpper
            );
        }

        localRange.tickLower = _tickLower;
        localRange.tickUpper = _tickUpper;

        localRanges[poolId] = localRange;
    }

    /**
     * @dev removes the tick liquidity for the given tick range
     * @param key the pool key
     * @param tickLower the lower tick of the range
     * @param tickUpper the upper tick of the range
     */
    function _removeTickLiquidities(
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper
    ) internal returns (int256) {
        PoolId poolId = key.toId();

        int256 liquidity;
        int256 totalLiquidity;

        for (int24 i = tickLower; i <= tickUpper; i += key.tickSpacing) {
            liquidity = tickLiquidities[poolId][i];
            tickLiquidities[poolId][i] = 0;
            totalLiquidity += liquidity;
        }

        return totalLiquidity;
    }

    /**
     * @dev updates the tick liquidity for the given range
     * @param key the pool key
     * @param tickLower the lower tick of the range
     * @param tickUpper the upper tick of the range
     */
    function _updateLocalRangeLiquidity(
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper
    ) internal {
        int24 tickSpacing = key.tickSpacing;
        PoolId poolId = key.toId();

        LocalRangeParams memory localRange = localRanges[poolId];

        int128 liquidity;

        for (int24 i = tickLower; i <= tickUpper; i += tickSpacing) {
            (, liquidity) = poolManager.getTickLiquidity(poolId, i);
            localRange.totalLiquidity += liquidity;
            localRange.totalLiquidity -= tickLiquidities[poolId][i];
            tickLiquidities[poolId][i] = liquidity;
        }

        localRanges[poolId] = localRange;
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

    /// @notice returns the liquidity time to live of a pool
    function getLiquidityTimeToLive(
        PoolId poolId
    ) external view returns (uint256 liqTimeToLive) {
        liqTimeToLive = poolMetrics[poolId].liqTimeToLive;
        if (liqTimeToLive == 0) revert OracleHook__DataNotAvailable();
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
        LocalRangeParams memory localRange = localRanges[key.toId()];

        int24 activeTick = _getActiveTick(key.toId());

        if (block.timestamp > localRange.lastUpdateTimestamp + TIME_THRESHOLD)
            return true;

        if (
            (int256(activeTick - localRange.lastActiveTick).abs() * BPS) /
                uint256(int256(2 * TICK_RANGE_OFFSET + 1)) >
            TICK_SHIFT_THRESHOLD
        ) return true;

        // TODO add liquidity change as a threshold

        //if (localRange.lastSnapshotTotalLiquidity == 0) return true;
        //else if (
        //    ((int256(localRange.totalLiquidity) -
        //        int256(localRange.lastSnapshotTotalLiquidity)).abs() * BPS) /
        //        localRange.lastSnapshotTotalLiquidity.abs() >
        //    LIQUIDITY_THRESHOLD
        //) return true;

        return false;
    }

    /// @dev gets the current active tick for a pool
    function _getActiveTick(
        PoolId poolId
    ) internal view returns (int24 activeTick) {
        (, activeTick, , ) = poolManager.getSlot0(poolId);
    }
}
