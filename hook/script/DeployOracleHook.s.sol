// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {PoolManager} from "v4-core/PoolManager.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {V4Quoter} from "v4-periphery/src/lens/V4Quoter.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {StateView} from "v4-periphery/src/lens/StateView.sol";

import {OracleHook} from "../src/OracleHook.sol";
import {HookMiner} from "./utils/HookMiner.sol";

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

contract DeployOracleHook is Script {
    using CurrencyLibrary for Currency;

    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    IPoolManager manager;
    PoolModifyLiquidityTest lpRouter;
    PoolSwapTest swapRouter;
    StateView stateView;
    V4Quoter quoter;

    Currency token0;
    Currency token1;

    OracleHook hook;

    function run() external {
        vm.createSelectFork("http://localhost:8545");

        vm.startBroadcast();
        deployV4Contracts();
        quoter = new V4Quoter(manager);
        deployMintAndApproveCurrencies();

        deployHookToAnvil();

        PoolKey memory poolKey = PoolKey({
            currency0: token0,
            currency1: token1,
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(hook)
        });

        manager.initialize(poolKey, SQRT_PRICE_1_1);

        vm.stopBroadcast();

        console.log("Oracle Hook deployed at:", address(hook));
        console.log("Pool Manager deployed at:", address(manager));
        console.log("Liquidity Router deployed at:", address(lpRouter));
        console.log("Swap Router deployed at:", address(swapRouter));
        console.log("State View deployed at:", address(stateView));
    }

    function deployV4Contracts() internal {
        manager = IPoolManager(address(new PoolManager(msg.sender)));
        lpRouter = new PoolModifyLiquidityTest(manager);
        swapRouter = new PoolSwapTest(manager);
        stateView = new StateView(manager);
    }

    function deployMintAndApproveCurrencies() internal {
        MockERC20 tokenA = new MockERC20("MockA", "A", 18);
        MockERC20 tokenB = new MockERC20("MockB", "B", 18);
        if (uint160(address(tokenA)) < uint160(address(tokenB))) {
            token0 = Currency.wrap(address(tokenA));
            token1 = Currency.wrap(address(tokenB));
        } else {
            token0 = Currency.wrap(address(tokenB));
            token1 = Currency.wrap(address(tokenA));
        }

        tokenA.mint(msg.sender, 100_000 ether);
        tokenB.mint(msg.sender, 100_000 ether);

        tokenA.approve(address(lpRouter), type(uint256).max);
        tokenB.approve(address(lpRouter), type(uint256).max);
        tokenA.approve(address(swapRouter), type(uint256).max);
        tokenB.approve(address(swapRouter), type(uint256).max);
    }

    function deployHookToAnvil() internal {
        uint160 flags = uint160(
            Hooks.AFTER_INITIALIZE_FLAG |
                Hooks.AFTER_SWAP_FLAG |
                Hooks.AFTER_ADD_LIQUIDITY_FLAG |
                Hooks.AFTER_REMOVE_LIQUIDITY_FLAG
        );
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_FACTORY,
            flags,
            type(OracleHook).creationCode,
            abi.encode(address(manager))
        );
        hook = new OracleHook{salt: salt}(manager);
        require(address(hook) == hookAddress, "hook: hook address mismatch");
    }
}
