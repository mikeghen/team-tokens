"""
Web server for viewing price history charts.
"""
from flask import Flask, render_template, jsonify
import logging
from database import get_all_games, get_price_history, generate_game_analysis_dataset, run_backtest

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route('/')
def index():
    """Render the price history page."""
    return render_template('price_history.html')


@app.route('/backtest')
def backtest_page():
    """Render the backtest results page."""
    return render_template('backtest.html')


@app.route('/api/games')
def api_games():
    """API endpoint to get all games."""
    try:
        games = get_all_games()
        return jsonify(games)
    except Exception as e:
        logger.error(f"Error fetching games: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/price-history/<int:game_id>')
def api_price_history(game_id):
    """API endpoint to get price history for a specific game."""
    try:
        from database import calculate_48h_average_price
        
        history = get_price_history(game_id)
        avg_48h = calculate_48h_average_price(game_id)
        
        return jsonify({
            "history": history,
            "avg_48h_price": avg_48h
        })
    except Exception as e:
        logger.error(f"Error fetching price history: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/game-analysis')
def api_game_analysis():
    """API endpoint to get game analysis data for all games."""
    try:
        analysis_data = generate_game_analysis_dataset()
        return jsonify(analysis_data)
    except Exception as e:
        logger.error(f"Error fetching game analysis: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/backtest')
def api_backtest():
    """API endpoint to get backtest simulation results."""
    try:
        backtest_data = run_backtest(initial_capital=10000.0, bet_percentage=0.02)
        return jsonify(backtest_data)
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
