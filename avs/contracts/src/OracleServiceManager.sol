// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {console} from "forge-std/console.sol";
import {ECDSAServiceManagerBase} from "@eigenlayer-middleware/src/unaudited/ECDSAServiceManagerBase.sol";
import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import {ECDSAUpgradeable} from "@openzeppelin-upgrades/contracts/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC1271Upgradeable} from "@openzeppelin-upgrades/contracts/interfaces/IERC1271Upgradeable.sol";
import {IOracleHook} from "./IOracleHook.sol";

contract OracleServiceManager is ECDSAServiceManagerBase {
    using ECDSAUpgradeable for bytes32;

    event NewTaskCreated(uint32 indexed taskIndex, Task task);
    event TaskResponded(uint32 indexed taskIndex, Task task, address operator);

    error OracleServiceManager__OnlyOperator();
    error OracleServiceManager__OnlyHook();
    error OracleServiceManager__TaskMismatch();
    error OracleServiceManager__AlreadyResponded();
    error OracleHook__InvalidSignature();

    struct Task {
        bytes32 poolId;
        int24 activeTick;
        int24 tickSpacing;
    }

    address public hook;
    uint32 public latestTaskNum;

    mapping(uint32 => bytes32) public allTaskHashes;
    mapping(address => mapping(uint32 => bytes)) public allTaskResponses;

    constructor(
        address _avsDirectory,
        address _stakeRegistry,
        address _rewardsCoordinator,
        address _delegationManager,
        address _allocationManager
    )
        ECDSAServiceManagerBase(
            _avsDirectory,
            _stakeRegistry,
            _rewardsCoordinator,
            _delegationManager,
            _allocationManager
        )
    {}

    function initialize(
        address initialOwner,
        address _rewardsInitiator,
        address _hook
    ) external initializer {
        __ServiceManagerBase_init(initialOwner, _rewardsInitiator);
        hook = _hook;
    }

    function createNewTask(
        bytes32 poolId,
        int24 activeTick,
        int24 tickSpacing
    ) external {
        if (msg.sender != hook) revert OracleServiceManager__OnlyHook();

        Task memory task = Task({
            poolId: poolId,
            activeTick: activeTick,
            tickSpacing: tickSpacing
        });

        allTaskHashes[latestTaskNum] = keccak256(abi.encode(task));

        console.log("Creating new task");
        console.logBytes32(poolId);
        emit NewTaskCreated(latestTaskNum, task);
        console.log("Task created");

        ++latestTaskNum;
    }

    function respondToTask(
        Task calldata task,
        uint32 referenceTaskIndex,
        IOracleHook.PoolMetrics memory poolMetrics,
        bytes memory signature
    ) external {
        console.logBytes32(task.poolId);
        console.logInt(task.activeTick);
        console.logInt(task.tickSpacing);

        if (!ECDSAStakeRegistry(stakeRegistry).operatorRegistered(msg.sender))
            revert OracleServiceManager__OnlyOperator();

        if (keccak256(abi.encode(task)) != allTaskHashes[referenceTaskIndex])
            revert OracleServiceManager__TaskMismatch();

        if (allTaskResponses[msg.sender][referenceTaskIndex].length > 0)
            revert OracleServiceManager__AlreadyResponded();

        // The message that was signed
        bytes32 messageHash = keccak256(
            abi.encodePacked(task.poolId, task.activeTick, task.tickSpacing)
        );
        console.logBytes32(messageHash);

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        console.logBytes32(ethSignedMessageHash);

        bytes4 magicValue = IERC1271Upgradeable.isValidSignature.selector;
        if (
            !(magicValue ==
                ECDSAStakeRegistry(stakeRegistry).isValidSignature(
                    ethSignedMessageHash,
                    signature
                ))
        ) {
            revert OracleHook__InvalidSignature();
        }

        // updating the storage with task responses
        allTaskResponses[msg.sender][referenceTaskIndex] = signature;

        // Update pool metrics
        console.log("Updating pool metrics");
        IOracleHook(hook).updatePoolMetrics(task.poolId, poolMetrics);

        console.log("Emmiting task response");
        emit TaskResponded(referenceTaskIndex, task, msg.sender);
    }

    function setAppointee(
        address appointee,
        address target,
        bytes4 selector
    ) external {}

    function removeAppointee(
        address appointee,
        address target,
        bytes4 selector
    ) external {}

    function addPendingAdmin(address admin) external {}

    function deregisterOperatorFromOperatorSets(
        address operator,
        uint32[] memory operatorSetIds
    ) external {}

    function removeAdmin(address admin) external {}

    function removePendingAdmin(address pendingAdmin) external {}
}
