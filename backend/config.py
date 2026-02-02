"""
Configuration for NBA Team Price History Extraction.
"""
import os
import logging
import csv

# API Endpoints
GAMMA_API_BASE = "https://gamma-api.polymarket.com"
CLOB_API_BASE = "https://clob.polymarket.com"

# Extraction Settings
PRICE_WINDOW_HOURS_BEFORE = 48
PRICE_WINDOW_HOURS_AFTER = 24
PRICE_FIDELITY = 60  # Hourly resolution

# File Settings
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "price_history")
GAME_SLUGS_FILE = os.path.join(os.path.dirname(__file__), "game_slugs.csv")
ERROR_LOG_FILE = os.path.join(os.path.dirname(__file__), "game_data_errors.log")

# Logging
LOG_LEVEL = logging.DEBUG
LOG_FORMAT = "%(asctime)s | %(levelname)s | %(message)s"

# Rate Limiting
REQUEST_DELAY_SECONDS = 0.1

# Team name to abbreviation mapping
TEAM_ABBREV = {
    "Atlanta Hawks": "atl",
    "Boston Celtics": "bos",
    "Brooklyn Nets": "bkn",
    "Charlotte Hornets": "cha",
    "Chicago Bulls": "chi",
    "Cleveland Cavaliers": "cle",
    "Dallas Mavericks": "dal",
    "Denver Nuggets": "den",
    "Detroit Pistons": "det",
    "Golden State Warriors": "gsw",
    "Houston Rockets": "hou",
    "Indiana Pacers": "ind",
    "Los Angeles Clippers": "lac",
    "Los Angeles Lakers": "lal",
    "Memphis Grizzlies": "mem",
    "Miami Heat": "mia",
    "Milwaukee Bucks": "mil",
    "Minnesota Timberwolves": "min",
    "New Orleans Pelicans": "nop",
    "New York Knicks": "nyk",
    "Oklahoma City Thunder": "okc",
    "Orlando Magic": "orl",
    "Philadelphia 76ers": "phi",
    "Phoenix Suns": "phx",
    "Portland Trail Blazers": "por",
    "Sacramento Kings": "sac",
    "San Antonio Spurs": "sas",
    "Toronto Raptors": "tor",
    "Utah Jazz": "uta",
    "Washington Wizards": "was",
}

# Reverse mapping - abbreviation to full name
ABBREV_TO_TEAM = {abbrev: name for name, abbrev in TEAM_ABBREV.items()}


def load_games_from_csv():
    """Load all games from the game_slugs.csv file.
    
    Returns:
        List of game dictionaries with 'slug', 'start_iso', 'date', 'visitor', 'home'
    """
    games = []
    try:
        with open(GAME_SLUGS_FILE, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                games.append({
                    'slug': row['slug'],
                    'start_iso': row['start_iso'],
                    'date': row['date'],
                    'visitor': row['visitor'],
                    'home': row['home']
                })
    except FileNotFoundError:
        logging.error(f"Game slugs file not found: {GAME_SLUGS_FILE}")
    except Exception as e:
        logging.error(f"Error loading game slugs: {e}")
    
    return games


def get_games_by_team(team_abbrev):
    """Get all games for a specific team (as visitor or home).
    
    Args:
        team_abbrev: Team abbreviation (e.g., 'phi', 'bos')
    
    Returns:
        List of game dictionaries for that team
    """
    all_games = load_games_from_csv()
    team_name = ABBREV_TO_TEAM.get(team_abbrev.lower())
    
    if not team_name:
        return []
    
    return [
        game for game in all_games
        if game['visitor'] == team_name or game['home'] == team_name
    ]


def log_game_data_error(slug, error_message):
    """Log an error when game data is not available.
    
    Args:
        slug: The game slug that had an error
        error_message: Description of the error
    """
    from datetime import datetime
    timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    
    with open(ERROR_LOG_FILE, 'a') as f:
        f.write(f"{timestamp} | {slug} | {error_message}\n")


# Load all games
ALL_GAMES = load_games_from_csv()

# Team Configuration - Build dynamically from game data
# Each team has a unique abbreviation, full name, and list of games
TEAMS = {}
for team_name, abbrev in TEAM_ABBREV.items():
    team_games = get_games_by_team(abbrev)
    if team_games:
        TEAMS[abbrev.upper()] = {
            "name": team_name,
            "games": [{"slug": g['slug'], "start_iso": g['start_iso']} for g in team_games]
        }

# Backward compatibility - keep SIXERS_GAMES reference
SIXERS_GAMES = TEAMS.get("PHI", {}).get("games", [])
CONSOLIDATED_FILENAME = "price_history_all.csv"
