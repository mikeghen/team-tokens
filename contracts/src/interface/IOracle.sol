// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title Unexpected Sports Oracle Interface
/// @dev This interface defines the structure and functions for an oracle that provides data about 
/// sports games, specifically for use with the Unexpected Sports protocol. The oracle allows for 
/// the registration of games and the recording of game data observations, such as market prices 
/// at specific timestamps.
interface Oracle {
    /// @notice Data specific to a game, such as the polymarket slug and the time of the game.
    struct GameData {
        string polymarket_slug;
        uint128 gameTime;
    }

    /// @notice An observation of the game data at a specific time, including the price of the market at that time.
    struct GameDataObservation {
        uint128 timestamp; 
        uint256 yesPrice;
        uint256 noPrice;
    }

    function registerGame(string memory _polymarket_slug, uint128 _gameTime) external returns (uint256);
    function recordGameData(uint256 _gameId, uint128 _timestamp, uint256 _yesPrice, uint256 _noPrice) external;
    function getGameData(uint256 _gameId) external view returns (GameData memory);
    function getTwapPrice(uint256 _gameId, uint128 _startTime, uint128 _endTime) external view returns (uint256 yesPrice, uint256 noPrice); 
}
