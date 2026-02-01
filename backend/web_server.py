"""
Web server for viewing price history charts.
"""
from flask import Flask, render_template, jsonify
import logging
from database import get_all_games, get_price_history

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route('/')
def index():
    """Render the main page with chart interface."""
    return render_template('index.html')


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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
