# Team Token Frontend

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