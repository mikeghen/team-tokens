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
 