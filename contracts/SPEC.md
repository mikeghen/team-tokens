# Unexpected Sports Market Smart Contracts

## Architecture

### Smart Contract Structure

![Architecture](../images/arch.png)

### Intent Based Prediction Market Integration
Off chain searchers/market makers will buy NO tokens on games directory from the contract. In this way, we avoid directly integrating with any one prediction market.

![Unexpected Sports Market](../images/UnexpectedSportsMarket.png)

### Automated Betting Pool
How it works:
- Vaults are created per team and hold USDC plus open game positions.
- Depositors receive ERC20 shares representing a pro-rata claim on vault assets.
- The vault uses the Oracle’s YES/NO prices to sell NO tokens to searchers.
- Each registered game triggers an automated 2% allocation at T-48 hours.
- Orders are streamed over 48 hours to reduce slippage and price impact.
- Purchased NO tokens are tracked per game and settle at game end.
- Share price updates reflect USDC balance plus mark-to-market of open bets.
- Rate limits cap daily deposit/withdraw changes to stabilize sizing.
- Admin registers games; all other actions are permissionless.
- Intent-based flow avoids direct prediction market integration.

## Sports Oracle
- Tracks the current YES/NO price for each game based on its game slug (e.g., nba-phi-atl-2026-01-31)
- Provides prices to the Unexpected Sports contracts to settle games
- Interface name is `Oracle` (file: IOracle.sol)
- Game registry
  - `registerGame(polymarket_slug, gameTime)` returns `gameId`
  - `getGameData(gameId)` returns `polymarket_slug` and `gameTime`
- Observations
  - `recordGameData(gameId, timestamp, yesPrice, noPrice)`
  - `getTwapPrice(gameId, startTime, endTime)` returns TWAP for YES/NO

## Unexpected Sports Vault
- Tokenized vault that executes an automated betting strategy (e.g., bet 2% of the vault per game)
- Manages deposits, withdraws, and share price tracking
- Dual user contract:
    - Token holders looking to participate in the automated betting
  - Searchers/market makers looking to buy NO tokens from the vault
- Admin can register games the vault will trade against

## Vault & Betting Mathmatics
- Vaults hold a balance and will automatically bet 2% of their balance on each game
 
## Actions
- Holder
  - Deposit, amount of USDC with a minimum share output
  - Withdraw, number of shares with a minimum USDC output
- Searcher/Market Maker
  - Buy, amount of USDC to spend on NO with minimum share output
  - Redeem, number of NO shares with minimum USDC output

## How to buy
- 48 hours before the game time, the contract expresses its intent to buy
- Checkpoints the funds cash balance at this time, computes what 2% of that is and that becomes how much we'll invest on the game in USDC amounts
- We take the 2% amount and then set up to buy slowly over the next 48 hours 
- Timeline:
  - T-48 hours, computes fund size, then computes 2%
  - T-1-48 hours, slowly makes funds available to sell as NO tokens at market price - discounting factor
  - USDC Amount Available = total / 48 hours * (48 - hours remaining)
  - NO available = USDC Available * YES Price

## Asset Tracking
- At any time, the fund holds the uninvested USDC plus some number of bets on games
- Sum the mark to market value of the individual outstanding bets
- Invests 2% of the current balance of USDC in the account, amounts for bets are excluded from the fund at the time they're placed (ie 48 hours before the event)

## Deposit and Withdraw Rate Limits
- A deposit and withdraw rate limit is set to make adding and remove USDC safer and simpler
- We enforce deposits that grow the funds by a threshold per day amount (e.g., 2% per day)
- Same for withdraw, though it would be smaller than the deposit threshold (e.g., 1% per day)
- Prevents complicated rebalancing math, allow always withdraw from some amount of principal, prevent exploits that could completely drain the fund or skew the bet sizes

## Formulas
- Per game bet amount as a function of time to game

## Interfaces

- Oracle
  - Register Game (slug, gameTime) -> gameId
  - Record Game Data (gameId, timestamp, yesPrice, noPrice)
  - Get Game Data (gameId -> slug, gameTime)
  - Get Game TWAP (gameId, startTime, endTime)

- Vault
  - Admin
    - Register Game (gameId)
    - Register Games (gameIds[])
  - Traders
    - Deposit (amount, minShares)
    - Withdraw (shares, minAmount)
  - Market Makers
    - Buy (gameId, amount, isYes, minShares)
    - Redeem (gameId, shares, minAmount)