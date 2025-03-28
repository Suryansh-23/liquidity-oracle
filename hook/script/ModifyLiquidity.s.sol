// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";

import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {OracleHook} from "../src/OracleHook.sol";
import {console} from "forge-std/console.sol";

contract ModifyLiquidity is Script {
    PoolModifyLiquidityTest public lpRouter;
    address public token0;
    address public token1;
    address public hook;

    function run(
        address _lpRouter,
        address _token0,
        address _token1,
        address _hook
    ) external {
        lpRouter = PoolModifyLiquidityTest(_lpRouter);
        token0 = _token0;
        token1 = _token1;
        hook = _hook;

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        MockERC20(token0).mint(address(this), 1_000_000 ether);
        MockERC20(token1).mint(address(this), 1_000_000 ether);

        MockERC20(token0).approve(address(lpRouter), type(uint256).max);
        MockERC20(token1).approve(address(lpRouter), type(uint256).max);

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
                liquidityDelta: 100000,
                salt: bytes32(0)
            }),
            ""
        );

        vm.stopBroadcast();
    }
}
