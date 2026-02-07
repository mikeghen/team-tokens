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
        string polymarket_slug; // Polymarket slug for the game, e.g., "nba-phi-dal-2024-10-30"
        string homeTeam; // Name of the home team, e.g., "PHI"
        string awayTeam; // Name of the away team, e.g., "DAL"
        uint128 gameTime; // Timestamp of when the game starts
        bool homeWin; // true if home team wins, false if away team wins
        GameDataObservation[] observations;
    }

    // @notice Maps keccak256 hash of the polymarket slug to the game ID to a game's data.
    // mapping(bytes32 _gameId => GameData) public games; // Mapping from game ID to game data

    /// @notice An observation of the game data at a specific time, including the price of the market at that time.
    struct GameDataObservation {
        uint128 timestamp; 
        uint256 yesPrice;
        uint256 noPrice;
    }

    function registerGame(GameData memory _gameData) external returns (uint256);
    function recordGameData(bytes32 _gameId, GameDataObservation memory _observation) external;

    /// @notice Retrieves the data for a specific game by its ID.
    /// @param _gameId The ID of the game for which to retrieve data.
    /// @return _gameData GameData struct containing information about the game and its observations.
    function getGameData(bytes32 _gameId) external view returns (GameData memory _gameData);

    /// @notice Gets the latest price for the "Yes" and "No" outcomes of a game.
    /// @param _gameId The ID of the game for which to retrieve the latest price
    /// @return yesPrice The latest price for the "Yes" outcome.
    /// @return noPrice The latest price for the "No" outcome.
    function getLatestPrice(bytes32 _gameId) external view returns (uint256 yesPrice, uint256 noPrice);

    /// @notice Retrieves the Time-Weighted Average Price (TWAP) for the "Yes" and "No" outcomes of a game between a specified start and end time.
    /// @param _gameId The ID of the game for which to retrieve the TWAP.
    /// @param _startTime The start time of the period over which to calculate the TWAP.
    /// @param _endTime The end time of the period over which to calculate the TWAP.
    /// @return yesPrice The TWAP for the "Yes" outcome.
    /// @return noPrice The TWAP for the "No" outcome.
    function getTwapPrice(bytes32 _gameId, uint128 _startTime, uint128 _endTime) external view returns (uint256 yesPrice, uint256 noPrice); 
}
