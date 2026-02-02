# Team Tokens
Prediction Market Derivative Tracking Sports Teams' Performance.

![Team Tokens](./TeamTokenSystem.png)

# Problem
- Prediction markets offer a way to financially benefit off of a sports teams performance
- As an individual, its difficult to capture the gain if your team has a good season.
- Challenges include:
  - Spending time manually placing bets for each game all season
  - Right sizing the bets you place so you don't run out of money
  - Not getting distracted by other markets promoted to you
  - Not getting addicted to sports betting
 
# Solution
- Automated Betting Pool that accepts deposits and automatically bets on a teams game
- A vault that accepts deposits of USDC and mints shares to the depositor
- A betting strategy for how to bet on the teams games (e.g., always bet 2% of the vault)
- A market market that sells NO tokens for each team game using intents

# Contributions
- New financial derivative that has the behavior:
  - In the short term: The derivative goes up if the team wins and down if the team loses.
  - In the long term: The derivative goes up if the team has an unexpectedly good season.
- Intent + Searcher architecture to avoid direct Prediction Market integrations.
- Automated betting strategy using DCA to enter positions
- 2nd order effect, creates a sustainable, independant oracle for moneyline probability data onchain
  - Each team token requires moneyline price data be posted onchain, once posted the data becomes publicly accessible to other contracts

# Project Structure
- Contracts: Solidity contracts manage deposit, withdraw, share price, automated bets through selling no tokens, price feed.
- Oracle: Python application monitors prices and posts onchain.
- Frontend: React application where investors can deposit USDC to get Team Token Shares for a team, searchers can buy NO tokens for games. 
