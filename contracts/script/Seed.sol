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

    string internal constant SEED_CSV_PATH = "script/seed_data.csv";

    Oracle public oracle;
    TeamVault public teamVault;

    mapping(bytes32 => bool) private _checkedGame;
    mapping(bytes32 => bool) private _seedAllowed;

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

        string memory csvData = vm.readFile(SEED_CSV_PATH);
        _seedFromCsv(csvData);

        vm.stopBroadcast();
    }

    function _seedFromCsv(string memory csvData) internal {
        bytes memory data = bytes(csvData);
        uint256 lineStart = 0;
        uint256 lineNum = 0;

        for (uint256 i = 0; i <= data.length; i++) {
            if (i == data.length || data[i] == 0x0a) {
                if (i > lineStart) {
                    string memory line = _slice(data, lineStart, i);
                    if (bytes(line).length > 0) {
                        if (lineNum > 0) {
                            _processCsvLine(line);
                        }
                        lineNum++;
                    }
                }
                lineStart = i + 1;
            }
        }
    }

    function _processCsvLine(string memory line) internal {
        bytes memory lineBytes = bytes(line);
        if (lineBytes.length == 0) return;
        if (lineBytes[lineBytes.length - 1] == 0x0d) {
            line = _slice(lineBytes, 0, lineBytes.length - 1);
            lineBytes = bytes(line);
        }

        uint256 idx = 0;
        string memory slug;
        string memory homeTeam;
        string memory awayTeam;
        uint256 gameTimeHoursAgo;
        bool homeWin;
        uint256 obsHoursAgo;
        uint256 yesPrice;
        uint256 noPrice;

        (slug, idx) = _nextField(lineBytes, idx);
        (homeTeam, idx) = _nextField(lineBytes, idx);
        (awayTeam, idx) = _nextField(lineBytes, idx);
        {
            string memory gameTimeField;
            (gameTimeField, idx) = _nextField(lineBytes, idx);
            gameTimeHoursAgo = _parseUint(gameTimeField);
        }
        {
            string memory homeWinField;
            (homeWinField, idx) = _nextField(lineBytes, idx);
            homeWin = _parseBool(homeWinField);
        }
        {
            string memory obsHoursField;
            (obsHoursField, idx) = _nextField(lineBytes, idx);
            obsHoursAgo = _parseUint(obsHoursField);
        }
        {
            string memory yesField;
            (yesField, idx) = _nextField(lineBytes, idx);
            yesPrice = _parseUint(yesField);
        }
        {
            string memory noField;
            (noField, idx) = _nextField(lineBytes, idx);
            noPrice = _parseUint(noField);
        }

        bytes32 gameId = keccak256(bytes(slug));
        if (!_checkedGame[gameId]) {
            _checkedGame[gameId] = true;
            bool isOracleRegistered;
            uint256 observationCount;

            try oracle.getGameData(gameId) returns (IOracle.GameData memory gameData) {
                isOracleRegistered = true;
                observationCount = gameData.observations.length;
            } catch {}

            if (!isOracleRegistered) {
                IOracle.GameDataObservation[] memory observations = new IOracle.GameDataObservation[](0);
                IOracle.GameData memory gameData = IOracle.GameData({
                    polymarket_slug: slug,
                    homeTeam: homeTeam,
                    awayTeam: awayTeam,
                    gameTime: uint128(block.timestamp - (gameTimeHoursAgo * 1 hours)),
                    homeWin: homeWin,
                    observations: observations
                });
                oracle.registerGame(gameData);
            }

            _seedAllowed[gameId] = (!isOracleRegistered || observationCount == 0);

            (, bool isRegistered,) = teamVault.gameInfo(gameId);
            if (!isRegistered) {
                teamVault.registerGame(gameId);
            }
        }

        if (!_seedAllowed[gameId]) {
            return;
        }

        uint128 timestamp = uint128(block.timestamp - (obsHoursAgo * 1 hours));
        oracle.recordGameData(
            gameId, IOracle.GameDataObservation({timestamp: timestamp, yesPrice: yesPrice, noPrice: noPrice})
        );
    }

    function _nextField(bytes memory lineBytes, uint256 start)
        internal
        pure
        returns (string memory field, uint256 nextIndex)
    {
        uint256 i = start;
        while (i < lineBytes.length && lineBytes[i] != 0x2c) {
            i++;
        }
        field = _slice(lineBytes, start, i);
        nextIndex = (i < lineBytes.length) ? i + 1 : i;
    }

    function _slice(bytes memory data, uint256 start, uint256 end) internal pure returns (string memory) {
        if (end <= start) {
            return "";
        }
        bytes memory out = new bytes(end - start);
        for (uint256 i = 0; i < end - start; i++) {
            out[i] = data[start + i];
        }
        return string(out);
    }

    function _parseUint(string memory s) internal pure returns (uint256 result) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
    }

    function _parseBool(string memory s) internal pure returns (bool) {
        bytes memory b = bytes(s);
        if (b.length == 1) {
            return b[0] == 0x31;
        }
        if (b.length == 4) {
            return (b[0] == 0x74 && b[1] == 0x72 && b[2] == 0x75 && b[3] == 0x65);
        }
        return false;
    }
}
