// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {Oracle} from "../src/Oracle.sol";
import {Oracle as IOracle} from "../src/interface/IOracle.sol";
import {TeamVault} from "../src/TeamVault.sol";

/// @title Localhost Seed Script
/// @notice Seeds the oracle and team vault with default game data.
contract Seed is Script {
    error Seed__UnsupportedChain(uint256 chainId);

    Oracle public oracle;
    TeamVault public teamVault;

    function run() external {
        if (block.chainid != 31_337) {
            revert Seed__UnsupportedChain(block.chainid);
        }

        // Anvil Account #1
        uint256 deployerKey =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(deployerKey);

        oracle = Oracle(vm.envAddress("ORACLE_ADDRESS"));
        teamVault = TeamVault(vm.envAddress("TEAM_VAULT_ADDRESS"));

        vm.startBroadcast(deployerKey);

        oracle.setReporter(deployer, true);

        _seedGame("nba-phi-dal-2026-02-10", "PHI", "DAL", uint128(block.timestamp + 3 days), false, 4e17, 6e17);
        _seedGame("nba-nyk-phi-2026-02-11", "NYK", "PHI", uint128(block.timestamp + 4 days), true, 45e16, 55e16);
        _seedGame("nba-phi-bos-2026-02-12", "PHI", "BOS", uint128(block.timestamp + 5 days), false, 5e17, 5e17);

        vm.stopBroadcast();
    }

    function _seedGame(
        string memory _slug,
        string memory _homeTeam,
        string memory _awayTeam,
        uint128 _gameTime,
        bool _homeWin,
        uint256 _yesPrice,
        uint256 _noPrice
    ) internal {
        bytes32 gameId = keccak256(bytes(_slug));
        bool isOracleRegistered;
        uint256 observationCount;

        try oracle.getGameData(gameId) returns (IOracle.GameData memory gameData) {
            isOracleRegistered = true;
            observationCount = gameData.observations.length;
        } catch {}

        if (!isOracleRegistered) {
            IOracle.GameDataObservation[] memory observations = new IOracle.GameDataObservation[](0);
            IOracle.GameData memory gameData = IOracle.GameData({
                polymarket_slug: _slug,
                homeTeam: _homeTeam,
                awayTeam: _awayTeam,
                gameTime: _gameTime,
                homeWin: _homeWin,
                observations: observations
            });
            oracle.registerGame(gameData);
        }

        if (!isOracleRegistered || observationCount == 0) {
            uint128 baseTime = uint128(block.timestamp - 3 hours);
            oracle.recordGameData(
                gameId, IOracle.GameDataObservation({timestamp: baseTime, yesPrice: _yesPrice, noPrice: _noPrice})
            );
            oracle.recordGameData(
                gameId,
                IOracle.GameDataObservation({timestamp: baseTime + 1 hours, yesPrice: _yesPrice, noPrice: _noPrice})
            );
        }

        (, bool isRegistered,) = teamVault.gameInfo(gameId);
        if (!isRegistered) {
            teamVault.registerGame(gameId);
        }
    }
}
