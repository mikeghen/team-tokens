# Unexpected Sports Market Frontend


The frontend application should have the following pages:

1. A home page that shows the TeamVault tokens share price overtime, this is the landing page for the application, which is designed to show information about a TeamVault. For our purposes, use PHI and game slugs like we use in the tests.

2. A Game list page showing all the games as well as the aggregate information about the USDC amount bet, the NO tokens sold, the latest price of the NO token, the PnL for the game, and the number of market makers participating. This would show all the vaults' wagers (VaultWager).

3. A Game View Page that will show the price overtime for a specific game, read from the oracle contract. This would show a vault's wager and price history. Includes an option for the connected account to buy the NO tokens for this specific game, if any are available for sale.

4. A Market Maker Wager List view that shows any wagers the market market account has opened, along with the latest price and pnl for them

5. A Market Maker Wager View that shows the details for a specific wager the market maker has made as well as a button to redeem the tokens from the Team Vault contract. 


## All Tokens View
- Line chart shows the performance of each team over the course of the season using the 2% automated betting strategy
- Table veiw below it shows % performance per team as well as game performance (wins/losses)
- Click into a team to view detailed game performance table data and a single line chart

## Account Management View
- Deposit, withdraw forms
- Price history view

## Game View
- Option to bet YES on each team in the game
- Liquidity available is based on the size of the vault and its bet on that game
- e.g., BOS plays PHI, BOS to win is 0.60, BOS fund is 2% of 100 USDC, PHI is 2% of 50 USDC, therefore:
    - 2 USDC bet buys 3.33 YES, so we sell 3.33 NO for 0.40 each 
    - 1 USDC bet buys 2.5 YES, so we sell 2.5 NO for 0.60 each
    - The UI shows available:
        - PHI YES, 3.33 at 0.4
        - BOS YES, 2.50 at 0.6
    - If BOS wins,
        - 2.50 BOS YES settles and 1 USDC leaves the contract