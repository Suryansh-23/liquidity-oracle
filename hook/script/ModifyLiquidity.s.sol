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
        PoolModifyLiquidityTest(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);
    address constant token0 = 0x0165878A594ca255338adfa4d48449f69242Eb8F;
    address constant token1 = 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707;
    address constant hook = 0x29820e2001bD7bd693dFAe8De645c4a9D21dd540;

    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        MockERC20(token0).mint(address(this), 1000_000 ether);
        MockERC20(token1).mint(address(this), 1000_000 ether);

        MockERC20(token0).approve(address(lpRouter), 1000_000 ether);
        MockERC20(token1).approve(address(lpRouter), 1000_000 ether);

        console.log(
            "service manager address: ",
            OracleHook(hook).serviceManager()
        );

        lpRouter.modifyLiquidity(
            PoolKey({
                currency0: Currency.wrap(token0),
                currency1: Currency.wrap(token1),
                fee: 500,
                tickSpacing: 10,
                hooks: IHooks(hook)
            }),
            IPoolManager.ModifyLiquidityParams({
                tickLower: -1000,
                tickUpper: 1000,
                liquidityDelta: 99997796809,
                salt: bytes32(0)
            }),
            ""
        );

        vm.stopBroadcast();
    }
}
