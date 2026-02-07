// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title Unexpected Sports Team Vault Interface
interface ITeamVault {
    // Game Life Cycle:
    // 1. Owner registers a game with the oracle and adds it to the vault
    // 2. Traders can deposit into the vault and receive shares
    // 3. Owner checkpoints the game 72 hours before its start time to record the usdcAmountForBet
    // 4. Based on the amount to wager, we compute how many YES tokens we could buy at the current price (as long as its within a certain percentage of the getTwapPrice)
    // 5. Market Makers then buy NO tokens, 1 NO token is available for each YES token the vault will want to buy with the usdcAmountForBet.
    // 6. The game starts, no more bets can be placed
    // 7. The game ends, the team wins means we keep the proceeds of the NO tokens we sold; if the team loses, the Market Makers can redeem their NO tokens for USDC from the vault.

    /// @notice GameWager tracks the vaults wager on each game
    /// @param usdcAmountForBet USDC amount escrowed for the bet
    /// @param noTokensSold NO Tokens sold for the bet, 1 USDC per 1 NO Token sold
    /// @param averageNoPrice Average price at which NO Tokens were sold
    /// @dev NO Tokens sold == USDC escrowed for the bet
    struct VaultWager {
        uint256 usdcAmountForBet;
        uint256 noTokensSold;
        uint256 averageNoPrice;
    }

    /// mapping(bytes32 gameId => VaultWager) public vaultWagers);

    /// @notice MarketMakerWager tracks the market makers wager on each game
    struct MarketMakerWager {
        uint256 noTokens;
        uint256 averagePrice;
    }
    /// mapping(bytes32 gameId => mapping(address marketMaker => MarketMakerWager)) public marketMakerWagers);
    /// INVAR: the sum of all the MarketMakerWagers no tokens == vaultWagers[gameId].noTokensSold

    // Owner Only
    // Required gameId is registered with the oracle before adding it to the vault
    function registerGame(bytes32 _gameId) external;
    function registerGames(bytes32[] memory _gameIds) external;

    // Traders Only
    // Enforce a deposit/withdraw rate limit that allows the fund to only increase or decrease by a certain percentage per day to prevent market manipulation
    // Enforce a 24 hour lockup period for withdrawals.
    // Always use the getLatestPrice from the oracle unless the getTwapPrice over the last 2 hours is within a certain percentage of the getLatestPrice to prevent market manipulation
    function deposit(uint256 _amount, uint256 _minShares) external;
    function withdraw(uint256 _shares, uint256 _minAmount) external;

    // Market Makers Only
    function buy(bytes32 _gameId, uint256 _amount, bool _isYes, uint256 _minShares) external;
    function redeem(bytes32 _gameId, uint256 _shares, uint256 _minAmount) external;

    // View Functions
    /// @notice getSharePrice returns the current price per share of the vault, calculated as total assets under management divided by total shares
    /// outstanding VaultWagers should be priced using the game's getLatestPrice from the oracle
    function getSharePrice() external view returns (uint256);
}
