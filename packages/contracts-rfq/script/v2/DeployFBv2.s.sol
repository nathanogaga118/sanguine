// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FastBridgeV2} from "../../contracts/FastBridgeV2.sol";

import {SynapseScript, stdJson} from "@synapsecns/solidity-devops/src/SynapseScript.sol";

// solhint-disable no-empty-blocks
contract DeployFastBridgeV2 is SynapseScript {
    using stdJson for string;

    string internal constant NAME = "FastBridgeV2";

    string internal config;
    address internal admin;
    FastBridgeV2 internal fastBridge;

    /// @notice We include an empty "test" function so that this contract does not appear in the coverage report.
    function testDeployFastBridgeV2() external {}

    function run() external broadcastWithHooks {
        deployWithChecks(ENVIRONMENT_PROD);
    }

    function runTestnet() external broadcastWithHooks {
        deployWithChecks("testnet");
    }

    function deployWithChecks(string memory environment) internal {
        loadConfig(environment);
        bytes memory constructorArgs = abi.encode(admin);
        // Use CREATE2 Factory to deploy the contract
        fastBridge = FastBridgeV2(
            deployAndSave({contractName: NAME, constructorArgs: constructorArgs, deployCodeFunc: cbDeployCreate2})
        );
    }

    function loadConfig(string memory environment) internal {
        config = readGlobalDeployConfig({contractName: NAME, environment: environment, revertIfNotFound: true});
        admin = config.readAddress(".accounts.admin");
    }

    function checkAdminCount() internal view {
        uint256 count = fastBridge.getRoleMemberCount(0);
        string memory statement = string.concat("Admin count is ", vm.toString(count));
        if (count != 1) {
            printFailWithIndent(string.concat(statement, " instead of 1"));
            assert(false);
        }
        printSuccessWithIndent(statement);
    }

    function checkAdmin() internal view {
        address adminAddress = fastBridge.getRoleMember(0, 0);
        string memory statement = string.concat("Admin address is ", vm.toString(adminAddress));
        if (adminAddress != admin) {
            printFailWithIndent(string.concat(statement, " instead of ", vm.toString(admin)));
            assert(false);
        }
        printSuccessWithIndent(statement);
    }
}
