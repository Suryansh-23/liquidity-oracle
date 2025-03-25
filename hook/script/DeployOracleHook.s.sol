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

import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";

import {OracleHook} from "../src/OracleHook.sol";
import {HookMiner} from "../test/utils/HookMiner.sol";

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {StdCheats} from "forge-std/StdCheats.sol";

contract DeployOracleHook is Script, StdCheats {
    using CurrencyLibrary for Currency;

    IPoolManager manager;
    PoolModifyLiquidityTest lpRouter;
    PoolSwapTest swapRouter;
    V4Quoter quoter;

    Currency token0;
    Currency token1;

    OracleHook hook;
    uint160 constant SQRT_PRICE = 79228162514264337593543950336;

    function run() external {
        vm.createSelectFork("http://localhost:8545");

        vm.startBroadcast();
        deployFreshManagerAndRouters();
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

        manager.initialize(poolKey, SQRT_PRICE);

        vm.stopBroadcast();

        // WRITE JSON DATA
        string memory parent_object = "parent object";
        string memory deployed_addresses = "addresses";
        vm.serializeAddress(
            deployed_addresses,
            "poolManager",
            address(manager)
        );
        vm.serializeAddress(deployed_addresses, "quoter", address(quoter));
        vm.serializeAddress(deployed_addresses, "lpRouter", address(lpRouter));
        vm.serializeAddress(
            deployed_addresses,
            "swapRouter",
            address(swapRouter)
        );
        vm.serializeAddress(
            deployed_addresses,
            "token0",
            Currency.unwrap(token0)
        );
        vm.serializeAddress(
            deployed_addresses,
            "token1",
            Currency.unwrap(token1)
        );

        string memory deployed_addresses_output = vm.serializeAddress(
            deployed_addresses,
            "hook",
            address(hook)
        );

        string memory final_json = vm.serializeString(
            parent_object,
            deployed_addresses,
            deployed_addresses_output
        );
        string memory outputDir = string.concat(
            vm.projectRoot(),
            "/script/output/"
        );
        string memory chainDir = string.concat(vm.toString(block.chainid), "/");
        string memory outputFilePath = string.concat(
            outputDir,
            chainDir,
            "oracle_hook_deployment_output",
            ".json"
        );
        //vm.writeJson(final_json, outputFilePath);
    }

    function deployFreshManagerAndRouters() internal {
        manager = IPoolManager(address(new PoolManager(msg.sender)));

        lpRouter = new PoolModifyLiquidityTest(manager);
        swapRouter = new PoolSwapTest(manager);
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
