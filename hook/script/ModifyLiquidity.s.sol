// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";

import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";

import {PoolManager} from "v4-core/PoolManager.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";

import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";

import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {SqrtPriceMath} from "v4-core/libraries/SqrtPriceMath.sol";
import {Position} from "v4-core/libraries/Position.sol";
import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";

import {OracleHook} from "../src/OracleHook.sol";

import {console} from "forge-std/console.sol";

contract ModifyLiquidity is Script {
    PoolModifyLiquidityTest constant lpRouter =
        PoolModifyLiquidityTest(0x325c8Df4CFb5B068675AFF8f62aA668D1dEc3C4B);
    address constant token0 = 0x8E45C0936fa1a65bDaD3222bEFeC6a03C83372cE;
    address constant token1 = 0xa62835D1A6bf5f521C4e2746E1F51c923b8f3483;
    address constant hook = 0xb3bE052D389B7775BAb1e12F5F0c2d0b70005540;

    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        MockERC20(token0).mint(address(this), 1000_000 ether);
        MockERC20(token1).mint(address(this), 1000_000 ether);

        MockERC20(token0).approve(address(lpRouter), 1000_000 ether);
        MockERC20(token1).approve(address(lpRouter), 1000_000 ether);

        console.log("service manager address: ", OracleHook(hook).serviceManager());

        lpRouter.modifyLiquidity(
            PoolKey({
                currency0: Currency.wrap(token0),
                currency1: Currency.wrap(token1),
                fee: 500,
                tickSpacing: 10,
                hooks: IHooks(hook)
            }),
            IPoolManager.ModifyLiquidityParams({
                tickLower: -887270,
                tickUpper: 887270,
                liquidityDelta: 9999997796809,
                salt: bytes32(0)
            }),
            ""
        );

        vm.stopBroadcast();
    }
}
