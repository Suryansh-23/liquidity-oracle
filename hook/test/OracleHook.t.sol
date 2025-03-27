// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

import {PoolManager} from "v4-core/PoolManager.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";

import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";

import {Hooks} from "v4-core/libraries/Hooks.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {SqrtPriceMath} from "v4-core/libraries/SqrtPriceMath.sol";
import {Position} from "v4-core/libraries/Position.sol";
import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";

import {console} from "forge-std/console.sol";

import {OracleHook} from "../src/OracleHook.sol";
import {MockServiceManager} from "./mocks/MockServiceManager.sol";

contract OracleHookTest is Test, Deployers {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolId;
    using StateLibrary for IPoolManager;

    int24 constant TICK_RANGE_OFFSET = 1_000;

    MockERC20 token0;
    MockERC20 token1;

    Currency token0Currency;
    Currency token1Currency;

    OracleHook hook;
    MockServiceManager serviceManager;
    PoolId poolId;

    function setUp() public {
        serviceManager = new MockServiceManager();

        deployFreshManagerAndRouters();

        token0 = new MockERC20("Token0", "TKN0", 18);
        token0Currency = Currency.wrap(address(token0));

        token1 = new MockERC20("Token1", "TKN1", 18);
        token1Currency = Currency.wrap(address(token1));

        // Mint a bunch of TOKEN to ourselves
        token0.mint(address(this), 1_000_000 ether);
        token1.mint(address(this), 1_000_000 ether);

        // Deploy hook to an address that has the proper flags set
        uint160 flags = uint160(
            Hooks.AFTER_INITIALIZE_FLAG |
                Hooks.AFTER_ADD_LIQUIDITY_FLAG |
                Hooks.AFTER_REMOVE_LIQUIDITY_FLAG |
                Hooks.AFTER_SWAP_FLAG
        );

        deployCodeTo("OracleHook.sol", abi.encode(manager), address(flags));

        // Deploy our hook
        hook = OracleHook(address(flags));

        token0.approve(address(swapRouter), type(uint256).max);
        token0.approve(address(modifyLiquidityRouter), type(uint256).max);

        token1.approve(address(swapRouter), type(uint256).max);
        token1.approve(address(modifyLiquidityRouter), type(uint256).max);

        // Initialize a pool
        (key, ) = initPool(
            token0Currency, // Currency 0
            token1Currency, // Currency 1
            hook, // Hook Contract
            500, // Swap Fees
            SQRT_PRICE_1_1 // Initial Sqrt(P) value = 1
        );

        hook.setServiceManager(address(serviceManager));

        poolId = key.toId();
    }

    function testOwnerCanSetServiceManager() public {
        address newManager = address(0x123);
        hook.setServiceManager(newManager);
        assertEq(hook.serviceManager(), newManager);

        address nonOwner = address(0x456);
        vm.prank(nonOwner);
        vm.expectRevert();
        hook.setServiceManager(address(0x789));
    }

    function testServiceManagerCanUpdatePoolMetrics() public {
        address nonManager = address(0x789);

        OracleHook.PoolMetrics memory metrics = OracleHook.PoolMetrics({
            liqTransition: 100,
            volatility: 200,
            depth: 400,
            spread: 500,
            liqConcentration: 600
        });

        vm.prank(nonManager);
        vm.expectRevert();
        hook.updatePoolMetrics(PoolId.unwrap(poolId), metrics);

        vm.prank(address(serviceManager));
        hook.updatePoolMetrics(PoolId.unwrap(poolId), metrics);
    }

    function testCanGetPoolMetrics() public {
        OracleHook.PoolMetrics memory metrics = OracleHook.PoolMetrics({
            liqTransition: 100,
            volatility: 200,
            depth: 400,
            spread: 500,
            liqConcentration: 600
        });

        vm.prank(address(serviceManager));
        hook.updatePoolMetrics(PoolId.unwrap(poolId), metrics);

        assertEq(hook.getLiquidityTransition(poolId), 100);
        assertEq(hook.getVolatility(poolId), 200);
        assertEq(hook.getDepth(poolId), 400);
        assertEq(hook.getSpread(poolId), 500);
        assertEq(hook.getLiquidityConcentration(poolId), 600);

        // Test error on unavailable data
        PoolId nonExistentPoolId = PoolId.wrap(bytes32(uint256(123456789)));

        vm.expectRevert();
        hook.getLiquidityTransition(nonExistentPoolId);

        vm.expectRevert();
        hook.getVolatility(nonExistentPoolId);

        vm.expectRevert();
        hook.getDepth(nonExistentPoolId);

        vm.expectRevert();
        hook.getSpread(nonExistentPoolId);

        vm.expectRevert();
        hook.getLiquidityConcentration(nonExistentPoolId);
    }

    function testAddLiquidityCanTriggerAVS() public {
        int24 tickLower = -100;
        int24 tickUpper = 100;

        uint256 totalLiq;

        // Calculate liquidity amount
        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(0);
        uint160 sqrtPriceLowerX96 = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtPriceUpperX96 = TickMath.getSqrtPriceAtTick(tickUpper);

        uint256 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            100 ether,
            100 ether
        );

        totalLiq += liquidity;

        vm.warp(block.timestamp + 2 minutes);

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int256(liquidity),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        (
            int24 lastActiveTick,
            int256 totalLiquidity,
            uint256 lastSnapshotTotalLiquidity,
            uint256 cumulativeLiquidityDelta,
            uint256 lastUpdateTimestamp
        ) = hook.snapshots(poolId);

        assertEq(lastActiveTick, 0);
        assertApproxEqAbs(totalLiquidity, int256(totalLiq), 1e3);
        assertApproxEqAbs(lastSnapshotTotalLiquidity, totalLiq, 1e3);
        assertEq(lastUpdateTimestamp, block.timestamp);

        sqrtPriceLowerX96 = TickMath.getSqrtPriceAtTick(-100);
        sqrtPriceUpperX96 = TickMath.getSqrtPriceAtTick(-90);

        liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            0,
            100 ether
        );

        totalLiq += liquidity;

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -100,
                tickUpper: -90,
                liquidityDelta: int256(liquidity),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        sqrtPriceLowerX96 = TickMath.getSqrtPriceAtTick(-110);
        sqrtPriceUpperX96 = TickMath.getSqrtPriceAtTick(-100);

        liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            0,
            100 ether
        );

        totalLiq += liquidity;

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -110,
                tickUpper: -100,
                liquidityDelta: int256(liquidity),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        (
            lastActiveTick,
            totalLiquidity,
            lastSnapshotTotalLiquidity,
            cumulativeLiquidityDelta,
            lastUpdateTimestamp
        ) = hook.snapshots(poolId);

        assertApproxEqAbs(totalLiquidity, int256(totalLiq), 1e3);
    }

    function testRemoveLiquidityCanTriggerAVS() public {
        _addLiquidity();

        (, int24 tickBefore, , ) = manager.getSlot0(poolId);

        (
            int24 lastActiveTickBefore,
            int256 totalLiquidityBefore,
            uint256 lastSnapshotTotalLiquidityBefore,
            ,
            uint256 lastUpdateTimestampBefore
        ) = hook.snapshots(poolId);

        vm.warp(block.timestamp + 5 seconds);

        uint256 liq = LiquidityAmounts.getLiquidityForAmounts(
            TickMath.getSqrtPriceAtTick(0),
            TickMath.getSqrtPriceAtTick(-100),
            TickMath.getSqrtPriceAtTick(100),
            10 ether,
            10 ether
        );

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -100,
                tickUpper: 100,
                liquidityDelta: -int256(liq),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        (
            int24 lastActiveTickAfter,
            int256 totalLiquidityAfter,
            uint256 lastSnapshotTotalLiquidityAfter,
            uint256 cumulativeLiquidityDeltaAfter,
            uint256 lastUpdateTimestampAfter
        ) = hook.snapshots(poolId);

        assertEq(lastActiveTickBefore, lastActiveTickAfter);
        assertEq(totalLiquidityAfter, totalLiquidityBefore - int256(liq));
        assertEq(
            lastSnapshotTotalLiquidityAfter,
            lastSnapshotTotalLiquidityBefore - liq
        );
        assertEq(cumulativeLiquidityDeltaAfter, 0);
        assertEq(lastUpdateTimestampAfter, block.timestamp);
    }

    function testMultipleLiquidityModifications() public {
        _addLiquidity();

        (
            ,
            int256 totalLiquidityBefore,
            uint256 lastSnapshotTotalLiquidityBefore,
            ,
            uint256 lastUpdateTimestampBefore
        ) = hook.snapshots(poolId);

        // small change in liquidity (remove)
        uint256 liq = LiquidityAmounts.getLiquidityForAmounts(
            TickMath.getSqrtPriceAtTick(0),
            TickMath.getSqrtPriceAtTick(-100),
            TickMath.getSqrtPriceAtTick(100),
            0.001 ether,
            0.001 ether
        );

        vm.warp(block.timestamp + 5 seconds);

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -100,
                tickUpper: 100,
                liquidityDelta: -int256(liq),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        (
            ,
            int256 totalLiquidityAfter,
            uint256 lastSnapshotTotalLiquidityAfter,
            uint256 cumulativeLiquidityDeltaAfter,
            uint256 lastUpdateTimestampAfter
        ) = hook.snapshots(poolId);

        assertEq(totalLiquidityAfter, totalLiquidityBefore - int256(liq));
        assertEq(
            lastSnapshotTotalLiquidityAfter,
            lastSnapshotTotalLiquidityBefore
        );
        assertEq(cumulativeLiquidityDeltaAfter, liq);
        assertEq(lastUpdateTimestampAfter, 1);

        // small change in liquidity (add)
        liq = LiquidityAmounts.getLiquidityForAmounts(
            TickMath.getSqrtPriceAtTick(0),
            TickMath.getSqrtPriceAtTick(-50),
            TickMath.getSqrtPriceAtTick(300),
            0.001 ether,
            0.001 ether
        );

        vm.warp(block.timestamp + 5 seconds);

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -50,
                tickUpper: 300,
                liquidityDelta: int256(liq),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        (
            ,
            int256 totalLiquidityAfterAdd,
            uint256 lastSnapshotTotalLiquidityAfterAdd,
            uint256 cumulativeLiquidityDeltaAfterAdd,
            uint256 lastUpdateTimestampAfterAdd
        ) = hook.snapshots(poolId);

        assertEq(totalLiquidityAfterAdd, totalLiquidityAfter + int256(liq));
        assertEq(
            lastSnapshotTotalLiquidityAfterAdd,
            lastSnapshotTotalLiquidityAfter
        );
        assertEq(
            cumulativeLiquidityDeltaAfterAdd,
            cumulativeLiquidityDeltaAfter + liq
        );
        assertEq(lastUpdateTimestampAfterAdd, 1);

        // large change is liqudity
        liq = LiquidityAmounts.getLiquidityForAmounts(
            TickMath.getSqrtPriceAtTick(0),
            TickMath.getSqrtPriceAtTick(-50),
            TickMath.getSqrtPriceAtTick(300),
            100 ether,
            100 ether
        );

        vm.warp(block.timestamp + 5 seconds);

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -200,
                tickUpper: 100,
                liquidityDelta: int256(liq),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        (
            ,
            int256 totalLiquidityAfterLarge,
            uint256 lastSnapshotTotalLiquidityAfterLarge,
            uint256 cumulativeLiquidityDeltaAfterLarge,
            uint256 lastUpdateTimestampAfterLarge
        ) = hook.snapshots(poolId);

        assertEq(
            totalLiquidityAfterLarge,
            totalLiquidityAfterAdd + int256(liq)
        );
        assertEq(
            lastSnapshotTotalLiquidityAfterLarge,
            uint256(totalLiquidityAfterLarge)
        );
        assertEq(cumulativeLiquidityDeltaAfterLarge, 0);
        assertEq(lastUpdateTimestampAfterLarge, 1 + 5 * 3);
    }

    function testSwapCanTriggerAVS() public {
        _addLiquidity();

        (, int24 tickBefore, , ) = manager.getSlot0(poolId);

        (
            int24 lastActiveTickBefore,
            int256 totalLiquidityBefore,
            uint256 lastSnapshotTotalLiquidityBefore,
            uint256 cumulativeLiquidityDeltaBefore,
            uint256 lastUpdateTimestampBefore
        ) = hook.snapshots(poolId);

        vm.warp(block.timestamp + 5 seconds);

        swapRouter.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -50 ether,
                sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ZERO_BYTES
        );

        (, int24 tickAfter, , ) = manager.getSlot0(poolId);

        (
            int24 lastActiveTickAfter,
            int256 totalLiquidityAfter,
            uint256 lastSnapshotTotalLiquidityAfter,
            uint256 cumulativeLiquidityDeltaAfter,
            uint256 lastUpdateTimestampAfter
        ) = hook.snapshots(poolId);
    }

    function testSmallSwapCannotTriggerAVS() public {
        _addLiquidity();

        (, int24 tickBefore, , ) = manager.getSlot0(poolId);

        (, , , , uint256 lastUpdateTimestampBefore) = hook.snapshots(poolId);

        vm.warp(block.timestamp + 5 seconds);

        // small swap, enough to shift tick by 1
        swapRouter.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -0.00025 ether,
                sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ZERO_BYTES
        );

        (, int24 tickAfter, , ) = manager.getSlot0(poolId);

        (, , , , uint256 lastUpdateTimestampAfter) = hook.snapshots(poolId);

        assert(tickBefore != tickAfter);
        assertEq(lastUpdateTimestampBefore, lastUpdateTimestampAfter);
    }

    function testTimeCanTriggerAVS() public {
        _addLiquidity();

        (, int24 tickBefore, , ) = manager.getSlot0(poolId);

        (
            int24 lastActiveTickBefore,
            ,
            ,
            ,
            uint256 lastUpdateTimestampBefore
        ) = hook.snapshots(poolId);

        vm.warp(block.timestamp + 10 minutes);

        // very small swap
        swapRouter.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: false,
                amountSpecified: 0.0001 ether,
                sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ZERO_BYTES
        );

        (, int24 tickAfter, , ) = manager.getSlot0(poolId);

        (
            int24 lastActiveTickAfter,
            ,
            ,
            ,
            uint256 lastUpdateTimestampAfter
        ) = hook.snapshots(poolId);

        assertEq(lastActiveTickAfter, tickAfter);
        assertEq(lastUpdateTimestampAfter, block.timestamp);
    }

    function _addLiquidity() internal {
        int24 currentTick = 0;
        int24 tickLower = currentTick - 100;
        int24 tickUpper = currentTick + 100;

        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(currentTick);
        uint160 sqrtPriceLowerX96 = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtPriceUpperX96 = TickMath.getSqrtPriceAtTick(tickUpper);

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            10 ether,
            10 ether
        );

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int256(uint256(liquidity)),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        tickLower = currentTick - 10;
        tickUpper = currentTick + 10;

        liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            100 ether,
            100 ether
        );

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int256(uint256(liquidity)),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        tickLower = currentTick - 50;
        tickUpper = currentTick + 50;

        liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            60 ether,
            60 ether
        );

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int256(uint256(liquidity)),
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );
    }
}
