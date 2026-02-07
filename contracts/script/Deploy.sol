// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {ERC20Mock} from "openzeppelin/mocks/token/ERC20Mock.sol";
import {Oracle} from "../src/Oracle.sol";
import {TeamVault} from "../src/TeamVault.sol";

/// @title Localhost Deploy Script
/// @notice Deploys the oracle, mock USDC, and team vault.
contract Deploy is Script {
    error Deploy__UnsupportedChain(uint256 chainId);

    string internal constant TEAM_SYMBOL = "PHI";
    uint256 internal constant USDC_MINT_AMOUNT = 1_000_000e18;

    Oracle public oracle;
    TeamVault public teamVault;
    ERC20Mock public usdc;
    function run() external {
        if (block.chainid != 31_337) {
            revert Deploy__UnsupportedChain(block.chainid);
        }

        // Anvil Account #1
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));

        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        oracle = new Oracle(deployer);
        oracle.setReporter(deployer, true);

        usdc = new ERC20Mock();
        usdc.mint(deployer, USDC_MINT_AMOUNT);

        teamVault = new TeamVault(deployer, address(oracle), address(usdc), TEAM_SYMBOL);

        vm.stopBroadcast();
    }
}
