# Team Tokens Smart Contracts

## Sports Oracle
- Tracks the current YES/NO price for each game based on its game slug (e.g., nba-phi-atl-2026-01-31)
- Provides prices to the Team Token contracts to settle games

## Team Token Vault
- Tokenized vault that executes an automated betting strategy (e.g., bet 2% of the vault per game)
- Manages deposits, withdraws, and share price tracking
- Dual user contract:
    - Token holders looking to participate in the automated betting
    - Searchers looking to buy NO tokens from the vault

## Vault & Betting Mathmatics
- Vaults hold a balance and will automatically bet 2% of their balance on each game
 
## Actions
- Holder
  - Deposit, amount of usdc
  - Withdraw, number of shares
- Searcher
  - Buy, number of no tokens
  - Redeem, number of no tokens

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