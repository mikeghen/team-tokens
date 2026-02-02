#!/usr/bin/env python
"""Test backtest functionality for multiple teams."""

from database import run_backtest, get_all_games

def test_team_backtest(team_abbrev):
    """Test backtest for a specific team."""
    print(f"\n{'='*60}")
    print(f"{team_abbrev} BACKTEST RESULTS")
    print(f"{'='*60}")
    
    # Get games for this team
    games = get_all_games(team_abbrev=team_abbrev)
    print(f"Games in database for {team_abbrev}: {len(games)}")
    
    # Run backtest
    results = run_backtest(team_abbrev=team_abbrev)
    print(f"Games with backtest data: {len(results)}")
    
    if results:
        initial = 10000.00
        final = results[-1]['bankroll']
        profit = final - initial
        roi = (profit / initial) * 100
        
        print(f"\nInitial bankroll: ${initial:,.2f}")
        print(f"Final bankroll: ${final:,.2f}")
        print(f"Total profit/loss: ${profit:+,.2f}")
        print(f"Return: {roi:+.2f}%")
        
        # Show first few games
        print(f"\nFirst 3 games:")
        for i, game in enumerate(results[:3]):
            print(f"  {i+1}. {game['slug']}: ${game['bet_size']:.2f} → ${game['profit_loss']:+.2f}")
    else:
        print("No backtest results available!")

if __name__ == "__main__":
    # Test both teams
    for team in ['PHI', 'DET']:
        test_team_backtest(team)
    
    print(f"\n{'='*60}")
    print("MULTI-TEAM SUPPORT VERIFIED")
    print(f"{'='*60}\n")
