// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FastBridgeV2} from "../../contracts/FastBridgeV2.sol";

import {SynapseScript, stdJson} from "@synapsecns/solidity-devops/src/SynapseScript.sol";

// solhint-disable no-empty-blocks
contract ConfigureFastBridgeV2 is SynapseScript {
    using stdJson for string;

    string internal constant NAME = "FastBridgeV2";

    string internal config;
    FastBridgeV2 internal fastBridge;

    bytes[] internal callsQueue;

    /// @notice We include an empty "test" function so that this contract does not appear in the coverage report.
    function testConfigureFastBridgeV2() external {}

    function run() external broadcastWithHooks {
        configureFB(ENVIRONMENT_PROD);
    }

    function runTestnet() external broadcastWithHooks {
        configureFB("testnet");
    }

    function configureFB(string memory environment) internal {
        loadConfig(environment);
        syncRole("governor", fastBridge.GOVERNOR_ROLE());
        syncRole("guard", fastBridge.GUARD_ROLE());
        syncRole("prover", fastBridge.PROVER_ROLE());
        syncRole("quoter", fastBridge.QUOTER_ROLE());
        syncRole("canceler", fastBridge.CANCELER_ROLE());
        setCancelDelay();
        setProtocolFeeRate();
        executeCalls();
    }

    function loadConfig(string memory environment) internal {
        config = readGlobalDeployConfig({contractName: NAME, environment: environment, revertIfNotFound: true});
        fastBridge = FastBridgeV2(getDeploymentAddress({contractName: NAME, revertIfNotFound: true}));
    }

    function executeCalls() internal {
        printLog("Multicalling the configuration calls");
        if (callsQueue.length == 0) {
            printSkipWithIndent("no calls to execute");
        }
        fastBridge.multicallNoResults({data: callsQueue, ignoreReverts: false});
    }

    function setCancelDelay() internal {
        printLog("Setting cancel delay");
        uint256 cancelDelay = config.readUint(".cancelDelay");
        if (cancelDelay == 0) {
            printSkipWithIndent("leaving the default value");
            return;
        }
        string memory action = string.concat("set to ", vm.toString(cancelDelay / 3600), " hours");
        if (fastBridge.cancelDelay() != cancelDelay) {
            fastBridge.setCancelDelay(cancelDelay);
            printSuccessWithIndent(string.concat("Cancel delay ", action));
        } else {
            printSkipWithIndent(string.concat("already ", action));
        }
    }

    function setProtocolFeeRate() internal {
        printLog("Setting protocol fee rate");
        uint256 protocolFeeRate = config.readUint(".protocolFeeRate");
        string memory action = string.concat("set to ", vm.toString(protocolFeeRate));
        if (fastBridge.protocolFeeRate() != protocolFeeRate) {
            fastBridge.setProtocolFeeRate(protocolFeeRate);
            printSuccessWithIndent(string.concat("Protocol fee rate ", action));
        } else {
            printSkipWithIndent(string.concat("already ", action));
        }
    }

    function syncRole(string memory roleName, bytes32 role) internal {
        string memory roleNamePlural = string.concat(roleName, "s");
        printLog(string.concat("Syncing ", roleNamePlural));
        address[] memory members = config.readAddressArray(string.concat(".accounts.", roleNamePlural));
        address[] memory existingMembers = getMembers(role);
        // Remove members that are not in the config
        uint256 removed = 0;
        for (uint256 i = 0; i < existingMembers.length; i++) {
            if (!contains(members, existingMembers[i])) {
                callsQueue.push(abi.encodeCall(fastBridge.revokeRole, (role, existingMembers[i])));
                printSuccessWithIndent(string.concat("Removing ", roleName, " ", vm.toString(existingMembers[i])));
                ++removed;
            }
        }
        // Add members that are in the config but not in the contract
        uint256 added = 0;
        for (uint256 i = 0; i < members.length; i++) {
            if (!contains(existingMembers, members[i])) {
                callsQueue.push(abi.encodeCall(fastBridge.grantRole, (role, members[i])));
                printSuccessWithIndent(string.concat("Adding ", roleName, " ", vm.toString(members[i])));
                ++added;
            }
        }
        if (added + removed == 0) {
            printSkipWithIndent(string.concat(roleNamePlural, " are up to date"));
        } else {
            printLog(
                string.concat(
                    "Adding ", vm.toString(added), " and removing ", vm.toString(removed), " ", roleNamePlural
                )
            );
        }
    }

    function getMembers(bytes32 role) internal view returns (address[] memory members) {
        uint256 count = fastBridge.getRoleMemberCount(role);
        members = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            members[i] = fastBridge.getRoleMember(role, i);
        }
    }

    function contains(address[] memory array, address value) internal pure returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) return true;
        }
        return false;
    }
}
