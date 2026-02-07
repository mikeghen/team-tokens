// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "openzeppelin/access/Ownable.sol";
import {Oracle as IOracle} from "./interface/IOracle.sol";

/// @title Unexpected Sports Oracle
/// @notice Stores game metadata and price observations for Unexpected Sports.
contract Oracle is Ownable, IOracle {
    /// @notice Thrown when a game is already registered.
    error Oracle__GameAlreadyRegistered(bytes32 gameId);

    /// @notice Thrown when a game is not registered.
    error Oracle__GameNotFound(bytes32 gameId);

    /// @notice Thrown when an observation has an invalid timestamp.
    error Oracle__InvalidTimestamp();

    /// @notice Thrown when observations are recorded out of order.
    error Oracle__ObservationOutOfOrder();

    /// @notice Thrown when TWAP inputs are invalid or insufficient.
    error Oracle__InvalidTimeRange();

    /// @notice Thrown when no observations exist for a game.
    error Oracle__NoObservations();

    /// @notice Thrown when the caller is not an authorized reporter.
    error Oracle__UnauthorizedReporter(address reporter);

    /// @notice Emitted when a game is registered.
    event GameRegistered(
        bytes32 indexed gameId,
        string polymarketSlug,
        uint128 gameTime,
        string homeTeam,
        string awayTeam
    );

    /// @notice Emitted when a new observation is recorded.
    event GameDataRecorded(bytes32 indexed gameId, uint128 timestamp, uint256 yesPrice, uint256 noPrice);

    /// @notice Emitted when a reporter is enabled or disabled.
    event ReporterSet(address indexed reporter, bool isAuthorized);

    mapping(bytes32 gameId => GameData gameData) private games;
    mapping(bytes32 gameId => bool isRegistered) private registered;
    mapping(address reporter => bool isAuthorized) private reporters;

    /// @notice Initializes the oracle with an owner.
    /// @param _owner The address that will own this contract.
    constructor(address _owner) Ownable(_owner) {}

    /// @notice Enables or disables an address as a reporter.
    /// @param _reporter The address to update.
    /// @param _isAuthorized True to authorize the reporter, false to revoke.
    function setReporter(address _reporter, bool _isAuthorized) external onlyOwner {
        reporters[_reporter] = _isAuthorized;
        emit ReporterSet(_reporter, _isAuthorized);
    }

    /// @notice Returns whether an address is an authorized reporter.
    /// @param _reporter The address to query.
    function isReporter(address _reporter) external view returns (bool) {
        return reporters[_reporter];
    }

    /// @inheritdoc IOracle
    function registerGame(GameData memory _gameData) external onlyOwner returns (uint256) {
        bytes32 _gameId = _gameIdFromSlug(_gameData.polymarket_slug);
        if (registered[_gameId]) {
            revert Oracle__GameAlreadyRegistered(_gameId);
        }

        GameData storage _storedGame = games[_gameId];
        _storedGame.polymarket_slug = _gameData.polymarket_slug;
        _storedGame.homeTeam = _gameData.homeTeam;
        _storedGame.awayTeam = _gameData.awayTeam;
        _storedGame.gameTime = _gameData.gameTime;
        _storedGame.homeWin = _gameData.homeWin;

        registered[_gameId] = true;

        emit GameRegistered(
            _gameId,
            _gameData.polymarket_slug,
            _gameData.gameTime,
            _gameData.homeTeam,
            _gameData.awayTeam
        );

        return uint256(_gameId);
    }

    /// @inheritdoc IOracle
    function recordGameData(bytes32 _gameId, GameDataObservation memory _observation) external {
        if (msg.sender != owner() && !reporters[msg.sender]) {
            revert Oracle__UnauthorizedReporter(msg.sender);
        }
        if (!registered[_gameId]) {
            revert Oracle__GameNotFound(_gameId);
        }
        if (_observation.timestamp == 0) {
            revert Oracle__InvalidTimestamp();
        }

        GameData storage _gameData = games[_gameId];
        uint256 _count = _gameData.observations.length;
        if (_count > 0) {
            uint128 _lastTimestamp = _gameData.observations[_count - 1].timestamp;
            if (_observation.timestamp <= _lastTimestamp) {
                revert Oracle__ObservationOutOfOrder();
            }
        }

        _gameData.observations.push(_observation);

        emit GameDataRecorded(_gameId, _observation.timestamp, _observation.yesPrice, _observation.noPrice);
    }

    /// @inheritdoc IOracle
    function getGameData(bytes32 _gameId) external view returns (GameData memory _gameData) {
        if (!registered[_gameId]) {
            revert Oracle__GameNotFound(_gameId);
        }

        return games[_gameId];
    }

    /// @inheritdoc IOracle
    function getLatestPrice(bytes32 _gameId) external view returns (uint256 yesPrice, uint256 noPrice) {
        if (!registered[_gameId]) {
            revert Oracle__GameNotFound(_gameId);
        }

        GameData storage _gameData = games[_gameId];
        uint256 _count = _gameData.observations.length;
        if (_count == 0) {
            revert Oracle__NoObservations();
        }

        GameDataObservation storage _latest = _gameData.observations[_count - 1];
        return (_latest.yesPrice, _latest.noPrice);
    }

    /// @inheritdoc IOracle
    function getTwapPrice(bytes32 _gameId, uint128 _startTime, uint128 _endTime)
        external
        view
        returns (uint256 yesPrice, uint256 noPrice)
    {
        if (!registered[_gameId]) {
            revert Oracle__GameNotFound(_gameId);
        }
        if (_startTime >= _endTime) {
            revert Oracle__InvalidTimeRange();
        }

        GameData storage _gameData = games[_gameId];
        uint256 _count = _gameData.observations.length;
        if (_count == 0) {
            revert Oracle__NoObservations();
        }

        uint256 _currentYes;
        uint256 _currentNo;
        uint128 _currentTime = _startTime;
        uint256 _yesWeighted;
        uint256 _noWeighted;
        uint256 _totalTime = uint256(_endTime - _startTime);
        uint256 _index;
        bool _hasStartPrice;

        while (_index < _count && _gameData.observations[_index].timestamp < _endTime) {
            GameDataObservation storage _obs = _gameData.observations[_index];

            // Observations at or before _startTime just set the starting price
            if (_obs.timestamp <= _startTime) {
                _currentYes = _obs.yesPrice;
                _currentNo = _obs.noPrice;
                _hasStartPrice = true;
                _index++;
                continue;
            }

            // All observations past _startTime require a valid start price
            if (!_hasStartPrice) break;

            // Accumulate the segment from _currentTime to this observation
            _yesWeighted += uint256(_obs.timestamp - _currentTime) * _currentYes;
            _noWeighted += uint256(_obs.timestamp - _currentTime) * _currentNo;

            _currentTime = _obs.timestamp;
            _currentYes = _obs.yesPrice;
            _currentNo = _obs.noPrice;
            _index++;
        }

        if (!_hasStartPrice) {
            revert Oracle__InvalidTimeRange();
        }

        // Extend the last known price to _endTime
        _yesWeighted += uint256(_endTime - _currentTime) * _currentYes;
        _noWeighted += uint256(_endTime - _currentTime) * _currentNo;
        return (_yesWeighted / _totalTime, _noWeighted / _totalTime);
    }

    function _gameIdFromSlug(string memory _slug) internal pure returns (bytes32) {
        return keccak256(bytes(_slug));
    }
}
