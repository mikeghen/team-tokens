"""
Web server for viewing price history charts.
"""
from flask import Flask, render_template, jsonify, request
import logging
from database import get_all_games, get_price_history, generate_game_analysis_dataset, run_backtest
from config import TEAMS

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route('/')
def index():
    """Render the price history page."""
    return render_template('price_history.html', teams=TEAMS)


@app.route('/backtest')
def backtest_page():
    """Render the backtest results page."""
    return render_template('backtest.html', teams=TEAMS)


@app.route('/api/games')
def api_games():
    """API endpoint to get all games, optionally filtered by team."""
    try:
        team = request.args.get('team', None)
        team_abbrev = team.upper() if team and team.upper() in TEAMS else None
        
        # Use database filtering instead of post-filtering
        games = get_all_games(team_abbrev=team_abbrev)
        
        return jsonify(games)
    except Exception as e:
        logger.error(f"Error fetching games: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/price-history/<int:game_id>')
def api_price_history(game_id):
    """API endpoint to get price history for a specific game."""
    try:
        from database import calculate_48h_average_price
        
        team = request.args.get('team', 'PHI')
        team_abbrev = team.upper() if team else 'PHI'
        
        history = get_price_history(game_id, team_abbrev)
        avg_48h = calculate_48h_average_price(game_id, team_abbrev)
        
        return jsonify({
            "history": history,
            "avg_48h_price": avg_48h
        })
    except Exception as e:
        logger.error(f"Error fetching price history: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/game-analysis')
def api_game_analysis():
    """API endpoint to get game analysis data, optionally filtered by team."""
    try:
        team = request.args.get('team', 'PHI')
        team_abbrev = team.upper() if team else 'PHI'
        
        # generate_game_analysis_dataset already filters by team via get_all_games
        analysis_data = generate_game_analysis_dataset(team_abbrev)
        
        return jsonify(analysis_data)
    except Exception as e:
        logger.error(f"Error fetching game analysis: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/backtest')
def api_backtest():
    """API endpoint to get backtest simulation results, optionally filtered by team."""
    try:
        team = request.args.get('team', 'PHI')
        team_abbrev = team.upper() if team else 'PHI'
        
        # run_backtest already filters by team via generate_game_analysis_dataset
        backtest_data = run_backtest(initial_capital=10000.0, bet_percentage=0.02, team_abbrev=team_abbrev)
        
        return jsonify(backtest_data)
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/backtest-all-teams')
def api_backtest_all_teams():
    """API endpoint to get backtest results for all teams."""
    try:
        all_results = {}
        
        for team_abbrev in TEAMS.keys():
            backtest_data = run_backtest(initial_capital=10000.0, bet_percentage=0.02, team_abbrev=team_abbrev)
            
            if backtest_data:
                final_bankroll = backtest_data[-1]['bankroll']
                total_return = final_bankroll - 10000.0
                return_percent = ((final_bankroll - 10000.0) / 10000.0) * 100
                
                all_results[team_abbrev] = {
                    'team': team_abbrev,
                    'team_name': TEAMS[team_abbrev]['name'],
                    'games': len(backtest_data),
                    'initial_capital': 10000.0,
                    'final_bankroll': final_bankroll,
                    'total_return': total_return,
                    'return_percent': return_percent,
                    'backtest_data': backtest_data
                }
        
        return jsonify(all_results)
    except Exception as e:
        logger.error(f"Error running multi-team backtest: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/teams')
def api_teams():
    """API endpoint to get all available teams."""
    try:
        teams_list = [
            {"abbrev": abbrev, "name": config["name"]}
            for abbrev, config in TEAMS.items()
        ]
        return jsonify(teams_list)
    except Exception as e:
        logger.error(f"Error fetching teams: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
