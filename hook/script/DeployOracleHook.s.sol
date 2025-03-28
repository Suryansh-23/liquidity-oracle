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
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {MockLiquidityRouter} from "../test/mocks/MockLiquidityRouter.sol";

import {OracleHook} from "../src/OracleHook.sol";
import {HookMiner} from "./utils/HookMiner.sol";

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {stdJson} from "forge-std/StdJson.sol";

contract DeployOracleHook is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    IPoolManager manager;
    PoolModifyLiquidityTest lpRouter;
    PoolSwapTest swapRouter;
    StateView stateView;
    V4Quoter quoter;
    MockLiquidityRouter liquidityRouter;
    Currency token0;
    Currency token1;

    OracleHook hook;

    function run() external {
        vm.createSelectFork("http://localhost:8545");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        deployV4Contracts();
        quoter = new V4Quoter(manager);

        deployMintCurrenciesAndLiquidityRouter();

        deployHookToAnvil(deployer);

        PoolKey memory poolKey = PoolKey({
            currency0: token0,
            currency1: token1,
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(hook)
        });

        PoolId poolId = poolKey.toId();

        manager.initialize(poolKey, SQRT_PRICE_1_1);

        vm.stopBroadcast();

        string memory json = "deployments.json";

        vm.writeJson(
            vm.serializeBytes32(json, "poolId", PoolId.unwrap(poolId)),
            json
        );
        vm.writeJson(
            vm.serializeAddress(json, "oracleHook", address(hook)),
            json
        );
        vm.writeJson(
            vm.serializeAddress(json, "poolManager", address(manager)),
            json
        );
        vm.writeJson(
            vm.serializeAddress(json, "liquidityRouter", address(lpRouter)),
            json
        );
        vm.writeJson(
            vm.serializeAddress(json, "swapRouter", address(swapRouter)),
            json
        );
        vm.writeJson(
            vm.serializeAddress(json, "stateView", address(stateView)),
            json
        );
        vm.writeJson(
            vm.serializeAddress(json, "token0", Currency.unwrap(token0)),
            json
        );
        vm.writeJson(
            vm.serializeAddress(json, "token1", Currency.unwrap(token1)),
            json
        );
        vm.writeJson(
            vm.serializeAddress(json, "modifyLiquidityTest", address(liquidityRouter)),
            json
        );
    }

    function deployV4Contracts() internal {
        manager = IPoolManager(address(new PoolManager(msg.sender)));
        lpRouter = new PoolModifyLiquidityTest(manager);
        swapRouter = new PoolSwapTest(manager);
        stateView = new StateView(manager);
    }

    function deployMintCurrenciesAndLiquidityRouter() internal {
        MockERC20 tokenA = new MockERC20("MockA", "A", 18);
        MockERC20 tokenB = new MockERC20("MockB", "B", 18);
        if (uint160(address(tokenA)) < uint160(address(tokenB))) {
            token0 = Currency.wrap(address(tokenA));
            token1 = Currency.wrap(address(tokenB));
        } else {
            token0 = Currency.wrap(address(tokenB));
            token1 = Currency.wrap(address(tokenA));
        }

        liquidityRouter = new MockLiquidityRouter(
            Currency.unwrap(token0),
            Currency.unwrap(token1),
            500,
            10,
            address(hook),
            address(lpRouter)
        );

        tokenA.mint(address(liquidityRouter), 100_000_000 ether);
        tokenB.mint(address(liquidityRouter), 100_000_000 ether);
    }

    function deployHookToAnvil(address owner) internal {
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
            abi.encode(address(manager), owner)
        );
        hook = new OracleHook{salt: salt}(manager, owner);
        require(address(hook) == hookAddress, "hook: hook address mismatch");
    }
}
