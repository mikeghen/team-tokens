// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title Unexpected Sports Team Vault Interface
interface ITeamVault {
    // Admin
    function registerGame(uint256 _gameId) external;
    function registerGames(uint256[] memory _gameIds) external;

    // Traders
    function deposit(uint256 _amount, uint256 _minShares) external;
    function withdraw(uint256 _shares, uint256 _minAmount) external;

    // Market Makers
    function buy(uint256 _gameId, uint256 _amount, bool _isYes, uint256 _minShares) external;
    function redeem(uint256 _gameId, uint256 _shares, uint256 _minAmount) external;
}
