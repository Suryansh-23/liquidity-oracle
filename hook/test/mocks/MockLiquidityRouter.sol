// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

contract MockLiquidityRouter {
    PoolKey poolKey;
    PoolModifyLiquidityTest immutable poolModifyLiquidityTest;

    constructor(
        address _token0,
        address _token1,
        uint24 _fee,
        int24 _tickSpacing,
        address _hook,
        address _poolModifyLiquidityTest
    ) {
        poolKey = PoolKey({
            currency0: Currency.wrap(_token0),
            currency1: Currency.wrap(_token1),
            fee: _fee,
            tickSpacing: _tickSpacing,
            hooks: IHooks(_hook)
        });

        poolModifyLiquidityTest = PoolModifyLiquidityTest(
            _poolModifyLiquidityTest
        );

        MockERC20(_token0).approve(
            address(poolModifyLiquidityTest),
            type(uint256).max
        );
        MockERC20(_token1).approve(
            address(poolModifyLiquidityTest),
            type(uint256).max
        );
    }

    function modifyLiquidity(
        int24 tickLower,
        int24 tickUpper,
        int128 liquidityDelta
    ) external {
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager
            .ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: liquidityDelta,
                salt: bytes32(0)
            });

        poolModifyLiquidityTest.modifyLiquidity(poolKey, params, "");
    }
}
