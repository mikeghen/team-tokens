// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TeamVault} from "../../src/TeamVault.sol";

contract TeamVaultHarness is TeamVault {
    constructor(address _owner, address _oracle, address _usdc, string memory _teamSymbol)
        TeamVault(_owner, _oracle, _usdc, _teamSymbol)
    {}

    function exposed_availableUsdcToSell(uint128 _gameTime, uint256 _usdcAmountForBet)
        external
        view
        returns (uint256)
    {
        return _availableUsdcToSell(_gameTime, _usdcAmountForBet);
    }

    function exposed_selectNoPrice(bytes32 _gameId) external view returns (uint256) {
        return _selectNoPrice(_gameId);
    }

    function exposed_weightedAveragePrice(uint256 _avgPrice, uint256 _avgAmount, uint256 _newPrice, uint256 _newAmount)
        external
        pure
        returns (uint256)
    {
        return _weightedAveragePrice(_avgPrice, _avgAmount, _newPrice, _newAmount);
    }

    function exposed_totalAssets() external view returns (uint256) {
        return _totalAssets();
    }

    function exposed_resolveTeamSide(bytes32 _gameId, string memory _homeTeam, string memory _awayTeam)
        external
        view
        returns (bool)
    {
        return _resolveTeamSide(_gameId, _homeTeam, _awayTeam);
    }

    function exposed_enforceRateLimit(bool _isIncrease, uint256 _amount, uint256 _currentAssets) external view {
        _enforceRateLimit(_isIncrease, _amount, _currentAssets);
    }

    function exposed_updateRateLimitBaseline(uint256 _newAssets) external {
        _updateRateLimitBaseline(_newAssets);
    }

    function exposed_setRateState(uint256 _timestamp, uint256 _assets) external {
        lastRateTimestamp = _timestamp;
        lastRateAssets = _assets;
    }

    function exposed_setVaultWager(bytes32 _gameId, uint256 _usdcAmount, uint256 _noTokens, uint256 _avgPrice) external {
        vaultWagers[_gameId] = VaultWager({usdcAmountForBet: _usdcAmount, noTokensSold: _noTokens, averageNoPrice: _avgPrice});
    }

    function exposed_setGameInfo(bytes32 _gameId, uint128 _gameTime, bool _isRegistered, bool _isHomeTeam) external {
        gameInfo[_gameId] = GameInfo({gameTime: _gameTime, isRegistered: _isRegistered, isHomeTeam: _isHomeTeam});
    }

    function exposed_setRegisteredGameIds(bytes32[] calldata _gameIds) external {
        registeredGameIds = _gameIds;
    }
}
