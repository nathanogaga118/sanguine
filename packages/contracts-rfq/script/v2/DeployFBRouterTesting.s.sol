// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {FastBridgeRouterV2} from "../../contracts/legacy/rfq/FastBridgeRouterV2.sol";

import {SynapseScript, stdJson} from "@synapsecns/solidity-devops/src/SynapseScript.sol";

// solhint-disable no-empty-blocks
contract DeployFastBridgeRouterTesting is SynapseScript {
    using stdJson for string;

    string internal constant NAME = "FastBridgeRouterV2";

    FastBridgeRouterV2 internal router;

    /// @notice We include an empty "test" function so that this contract does not appear in the coverage report.
    function testDeployFastBridgeRouterTesting() external {}

    function run() external broadcastWithHooks {
        // Use CREATE2 Factory to deploy the contract
        address owner = msg.sender;
        printLog(string.concat("Deploying FastBridgeRouterV2 with owner ", vm.toString(owner)));
        bytes memory constructorArgs = abi.encode(owner);
        router = FastBridgeRouterV2(
            payable(
                deployAndSave({contractName: NAME, constructorArgs: constructorArgs, deployCodeFunc: cbDeployCreate2})
            )
        );
        setSwapQuoter();
        setFastBridge();
    }

    function setSwapQuoter() internal {
        printLog("Setting swap quoter");
        address quoter = getDeploymentAddress({contractName: "SwapQuoterV2", revertIfNotFound: true});
        string memory action = string.concat("set to ", vm.toString(quoter));
        if (router.swapQuoter() != quoter) {
            router.setSwapQuoter(quoter);
            printSuccessWithIndent(string.concat("Swap quoter ", action));
        } else {
            printSkipWithIndent(string.concat("already ", action));
        }
    }

    function setFastBridge() internal {
        printLog("Setting fast bridge");
        address fastBridge = getDeploymentAddress({contractName: "FastBridgeV2", revertIfNotFound: true});
        string memory action = string.concat("set to ", vm.toString(fastBridge));
        if (router.fastBridge() != fastBridge) {
            router.setFastBridge(fastBridge);
            printSuccessWithIndent(string.concat("Fast bridge ", action));
        } else {
            printSkipWithIndent(string.concat("already ", action));
        }
    }
}
