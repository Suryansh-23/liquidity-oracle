// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@eigenlayer/contracts/permissions/PauserRegistry.sol";
import {IDelegationManager} from "@eigenlayer/contracts/interfaces/IDelegationManager.sol";
import {IAVSDirectory} from "@eigenlayer/contracts/interfaces/IAVSDirectory.sol";
import {IStrategyManager, IStrategy} from "@eigenlayer/contracts/interfaces/IStrategyManager.sol";
import {ISlasher} from "@eigenlayer-middleware/src/interfaces/ISlasher.sol";
import {StrategyBaseTVLLimits} from "@eigenlayer/contracts/strategies/StrategyBaseTVLLimits.sol";
import "@eigenlayer/test/mocks/EmptyContract.sol";

import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import {IECDSAStakeRegistryTypes} from "@eigenlayer-middleware/src/interfaces/IECDSAStakeRegistry.sol";
import "@eigenlayer-middleware/src/OperatorStateRetriever.sol";

import {OracleServiceManager} from "../src/OracleServiceManager.sol";
import {ERC20Mock} from "@eigenlayer-middleware/test/mocks/ERC20Mock.sol";
import {Utils} from "./utils/Utils.sol";

import {Script} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {console} from "forge-std/console.sol";

contract DeployAVS is Script, Utils {
    ERC20Mock public erc20Mock;
    StrategyBaseTVLLimits public erc20MockStrategy;

    ProxyAdmin public avsProxyAdmin;
    PauserRegistry public avsPauserRegistry;

    ECDSAStakeRegistry public stakeRegistryProxy;
    ECDSAStakeRegistry public stakeRegistryImpl;

    OracleServiceManager public serviceManagerProxy;
    OracleServiceManager public serviceManagerImpl;

    function run(address hook) external {
        vm.createSelectFork("http://localhost:8545");

        // Eigenlayer contracts
        string memory eigenlayerDeployedContracts = readOutput(
            "eigenlayer_deployment_output"
        );
        IStrategyManager strategyManager = IStrategyManager(
            stdJson.readAddress(
                eigenlayerDeployedContracts,
                ".addresses.strategyManager"
            )
        );
        IDelegationManager delegationManager = IDelegationManager(
            stdJson.readAddress(
                eigenlayerDeployedContracts,
                ".addresses.delegation"
            )
        );
        IAVSDirectory avsDirectory = IAVSDirectory(
            stdJson.readAddress(
                eigenlayerDeployedContracts,
                ".addresses.avsDirectory"
            )
        );
        ProxyAdmin eigenLayerProxyAdmin = ProxyAdmin(
            stdJson.readAddress(
                eigenlayerDeployedContracts,
                ".addresses.eigenLayerProxyAdmin"
            )
        );
        PauserRegistry eigenLayerPauserReg = PauserRegistry(
            stdJson.readAddress(
                eigenlayerDeployedContracts,
                ".addresses.eigenLayerPauserReg"
            )
        );
        StrategyBaseTVLLimits baseStrategyImplementation = StrategyBaseTVLLimits(
                stdJson.readAddress(
                    eigenlayerDeployedContracts,
                    ".addresses.baseStrategyImplementation"
                )
            );

        address avsCommunityMultisig = msg.sender;
        address avsPauser = msg.sender;

        vm.startBroadcast();
        _deployErc20AndStrategyAndWhitelistStrategy(
            eigenLayerProxyAdmin,
            eigenLayerPauserReg,
            baseStrategyImplementation,
            strategyManager
        );
        _deployAvsContracts(
            delegationManager,
            avsDirectory,
            erc20MockStrategy,
            avsCommunityMultisig,
            avsPauser,
            hook
        );
        vm.stopBroadcast();
    }

    function _deployErc20AndStrategyAndWhitelistStrategy(
        ProxyAdmin eigenLayerProxyAdmin,
        PauserRegistry eigenLayerPauserReg,
        StrategyBaseTVLLimits baseStrategyImplementation,
        IStrategyManager strategyManager
    ) internal {
        erc20Mock = new ERC20Mock();
        // TODO(samlaf): any reason why we are using the strategybase with tvl limits instead of just using strategybase?
        // the maxPerDeposit and maxDeposits below are just arbitrary values.
        erc20MockStrategy = StrategyBaseTVLLimits(
            address(
                new TransparentUpgradeableProxy(
                    address(baseStrategyImplementation),
                    address(eigenLayerProxyAdmin),
                    abi.encodeWithSelector(
                        StrategyBaseTVLLimits.initialize.selector,
                        1 ether, // maxPerDeposit
                        100 ether, // maxDeposits
                        address(erc20Mock),
                        eigenLayerPauserReg
                    )
                )
            )
        );
        IStrategy[] memory strats = new IStrategy[](1);
        strats[0] = erc20MockStrategy;
        bool[] memory thirdPartyTransfersForbiddenValues = new bool[](1);
        thirdPartyTransfersForbiddenValues[0] = false;
        strategyManager.addStrategiesToDepositWhitelist(strats);
    }

    function _deployAvsContracts(
        IDelegationManager delegationManager,
        IAVSDirectory avsDirectory,
        IStrategy strat,
        address avsCommunityMultisig,
        address avsPauser,
        address hook
    ) internal {
        // Adding this as a temporary fix to make the rest of the script work with a single strategy
        // since it was originally written to work with an array of strategies
        IStrategy[1] memory deployedStrategyArray = [strat];
        uint numStrategies = deployedStrategyArray.length;

        // deploy proxy admin for ability to upgrade proxy contracts
        avsProxyAdmin = new ProxyAdmin();

        // deploy pauser registry
        {
            address[] memory pausers = new address[](2);
            pausers[0] = avsPauser;
            pausers[1] = avsCommunityMultisig;
            avsPauserRegistry = new PauserRegistry(
                pausers,
                avsCommunityMultisig
            );
        }

        EmptyContract emptyContract = new EmptyContract();

        // hard-coded inputs

        /**
         * First, deploy upgradeable proxy contracts that **will point** to the implementations. Since the implementation contracts are
         * not yet deployed, we give these proxies an empty contract as the initial implementation, to act as if they have no code.
         */
        serviceManagerProxy = OracleServiceManager(
            address(
                new TransparentUpgradeableProxy(
                    address(emptyContract),
                    address(avsProxyAdmin),
                    ""
                )
            )
        );
        stakeRegistryProxy = ECDSAStakeRegistry(
            address(
                new TransparentUpgradeableProxy(
                    address(emptyContract),
                    address(avsProxyAdmin),
                    ""
                )
            )
        );

        // Second, deploy the *implementation* contracts, using the *proxy contracts* as inputs
        {
            stakeRegistryImpl = new ECDSAStakeRegistry(delegationManager);

            avsProxyAdmin.upgrade(
                ITransparentUpgradeableProxy(
                    payable(address(stakeRegistryProxy))
                ),
                address(stakeRegistryImpl)
            );
        }

        {
            IECDSAStakeRegistryTypes.StrategyParams[]
                memory quorumsStrategyParams = new IECDSAStakeRegistryTypes.StrategyParams[](
                    numStrategies
                );

            for (uint j = 0; j < numStrategies; j++) {
                quorumsStrategyParams[j] = IECDSAStakeRegistryTypes
                    .StrategyParams({
                        strategy: deployedStrategyArray[j],
                        multiplier: 10_000
                    });
            }

            IECDSAStakeRegistryTypes.Quorum
                memory quorum = IECDSAStakeRegistryTypes.Quorum(
                    quorumsStrategyParams
                );

            avsProxyAdmin.upgradeAndCall(
                ITransparentUpgradeableProxy(
                    payable(address(stakeRegistryProxy))
                ),
                address(stakeRegistryImpl),
                abi.encodeWithSelector(
                    ECDSAStakeRegistry.initialize.selector,
                    address(serviceManagerProxy),
                    1,
                    quorum
                )
            );
        }

        serviceManagerImpl = new OracleServiceManager(
            address(avsDirectory),
            address(stakeRegistryProxy),
            address(0),
            address(delegationManager),
            address(0),
            hook
        );
        // Third, upgrade the proxy contracts to use the correct implementation contracts and initialize them.
        avsProxyAdmin.upgrade(
            ITransparentUpgradeableProxy(payable(address(serviceManagerProxy))),
            address(serviceManagerImpl)
        );

        // WRITE JSON DATA
        string memory parent_object = "parent object";

        string memory deployed_addresses = "addresses";
        vm.serializeAddress(
            deployed_addresses,
            "erc20Mock",
            address(erc20Mock)
        );
        vm.serializeAddress(
            deployed_addresses,
            "erc20MockStrategy",
            address(erc20MockStrategy)
        );
        vm.serializeAddress(
            deployed_addresses,
            "serviceManagerProxy",
            address(serviceManagerProxy)
        );
        vm.serializeAddress(
            deployed_addresses,
            "serviceManagerImpl",
            address(serviceManagerImpl)
        );
        vm.serializeAddress(
            deployed_addresses,
            "stakeRegistryProxy",
            address(stakeRegistryProxy)
        );

        string memory deployed_addresses_output = vm.serializeAddress(
            deployed_addresses,
            "stakeRegistryImpl",
            address(stakeRegistryImpl)
        );

        // serialize all the data
        string memory finalJson = vm.serializeString(
            parent_object,
            deployed_addresses,
            deployed_addresses_output
        );

        writeOutput(finalJson, "oracle_avs_deployment_output");
    }
}
