"""
Database module for price history storage.
"""
import sqlite3
import csv
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DB_PATH = "price_history.db"


def get_team_from_slug(slug: str, team_abbrev: str) -> bool:
    """Determine if the tracked team is away (second position) in the slug.
    
    Args:
        slug: Game slug (e.g., 'nba-phi-bos' or 'nba-bos-phi')
        team_abbrev: Team abbreviation to check (e.g., 'PHI', 'DET')
        
    Returns:
        True if team is in away position (index 2), False if home (index 1)
    """
    parts = slug.split('-')
    # Team at index 2 is away, index 1 is home
    return len(parts) >= 3 and parts[2].lower() == team_abbrev.lower()


def init_database():
    """Initialize the SQLite database with schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create games table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team TEXT NOT NULL,
            game_date TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            game_start_utc TEXT NOT NULL,
            token_id TEXT NOT NULL
        )
    """)
    
    # Create price_history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            timestamp_utc TEXT NOT NULL,
            price REAL NOT NULL,
            fidelity_minutes INTEGER NOT NULL,
            FOREIGN KEY (game_id) REFERENCES games (id)
        )
    """)
    
    # Create indexes for performance
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_game_date ON games(game_date)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_game_team ON games(team)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_price_history_game_timestamp 
        ON price_history(game_id, timestamp_utc)
    """)
    
    conn.commit()
    conn.close()
    logger.info("Database initialized", extra={"db_path": DB_PATH})


def load_csv_to_database(csv_path: str = "price_history/price_history_all.csv"):
    """Load price history from CSV into SQLite database.
    
    Args:
        csv_path: Path to the consolidated CSV file
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Clear existing data
    cursor.execute("DELETE FROM price_history")
    cursor.execute("DELETE FROM games")
    
    games_cache = {}
    
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            slug = row['slug']
            
            # Insert game (first time we see it)
            if slug not in games_cache:
                # Extract team from slug - we'll store 'ALL' since each game involves two teams
                cursor.execute("""
                    INSERT INTO games (team, game_date, slug, game_start_utc, token_id)
                    VALUES (?, ?, ?, ?, ?)
                """, ('ALL', row['game_date'], slug, row['game_start_utc'], row['token_id']))
                game_id = cursor.lastrowid
                games_cache[slug] = game_id
            else:
                game_id = games_cache[slug]
            
            # Insert price history
            cursor.execute("""
                INSERT INTO price_history (game_id, timestamp_utc, price, fidelity_minutes)
                VALUES (?, ?, ?, ?)
            """, (game_id, row['timestamp_utc'], float(row['price']), int(row['fidelity_minutes'])))
    
    conn.commit()
    
    # Log stats
    cursor.execute("SELECT COUNT(*) FROM games")
    game_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM price_history")
    price_count = cursor.fetchone()[0]
    
    conn.close()
    
    logger.info(
        "CSV data loaded into database",
        extra={"games": game_count, "price_points": price_count}
    )


def get_all_games(team_abbrev: str = None) -> List[Dict[str, Any]]:
    """Get all games from database, optionally filtered by team.
    
    Args:
        team_abbrev: Optional team abbreviation to filter by (e.g., 'PHI', 'DET')
    
    Returns:
        List of game dictionaries
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if team_abbrev:
        # Filter by slug pattern - team can be at position 1 (away) or 2 (home)
        # Format: nba-team1-team2-YYYY-MM-DD
        team_lower = team_abbrev.lower()
        cursor.execute("""
            SELECT id, team, game_date, slug, game_start_utc, token_id
            FROM games
            WHERE slug LIKE ? OR slug LIKE ?
            ORDER BY game_date ASC
        """, (f'nba-{team_lower}-%', f'nba-%-{team_lower}-%'))
    else:
        cursor.execute("""
            SELECT id, team, game_date, slug, game_start_utc, token_id
            FROM games
            ORDER BY game_date ASC
        """)
    
    games = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return games


def get_price_history(game_id: int, team_abbrev: str = "PHI") -> List[Dict[str, Any]]:
    """Get price history for a specific game.
    
    Automatically inverts prices when the tracked team is the away team (second team in slug)
    so that prices always represent the probability of the tracked team winning.
    
    Args:
        game_id: Game ID
        team_abbrev: Team abbreviation (e.g., 'PHI', 'DET')
        
    Returns:
        List of price history dictionaries
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get game slug to determine if we need to invert prices
    cursor.execute("""
        SELECT slug FROM games WHERE id = ?
    """, (game_id,))
    game_row = cursor.fetchone()
    if not game_row:
        conn.close()
        return []
    
    slug = game_row['slug']
    # Check if tracked team is away (second position in slug)
    is_team_away = get_team_from_slug(slug, team_abbrev)
    
    cursor.execute("""
        SELECT timestamp_utc, price, fidelity_minutes
        FROM price_history
        WHERE game_id = ?
        ORDER BY timestamp_utc ASC
    """, (game_id,))
    
    history = []
    for row in cursor.fetchall():
        entry = dict(row)
        # Invert price if tracked team is away (so price always represents tracked team's win probability)
        if is_team_away:
            entry['price'] = 100.0 - entry['price']
        history.append(entry)
    
    conn.close()
    
    return history


def calculate_48h_average_price(game_id: int, team_abbrev: str = "PHI") -> float:
    """Calculate the average price in the 48 hours leading up to game start.
    
    Args:
        game_id: Game ID
        team_abbrev: Team abbreviation (e.g., 'PHI', 'DET')
        
    Returns:
        Average price in the 48 hours before game start, or None if insufficient data
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get game info
    cursor.execute("""
        SELECT slug, game_start_utc FROM games WHERE id = ?
    """, (game_id,))
    game_row = cursor.fetchone()
    if not game_row:
        conn.close()
        return None
    
    slug = game_row['slug']
    game_start_utc = game_row['game_start_utc']
    # Parse game_start_utc which has format: 2025-10-22T23:30:00Z
    game_start_dt = datetime.fromisoformat(game_start_utc.replace('Z', '+00:00'))
    
    # Check if tracked team is away (second position in slug)
    is_team_away = get_team_from_slug(slug, team_abbrev)
    
    # Get all price history for this game
    cursor.execute("""
        SELECT timestamp_utc, price
        FROM price_history
        WHERE game_id = ?
        ORDER BY timestamp_utc ASC
    """, (game_id,))
    
    prices_in_window = []
    for row in cursor.fetchall():
        timestamp_utc = row['timestamp_utc']
        price = row['price']
        
        # Parse timestamp which has format: 2025-10-21 00:00:15 (no timezone)
        # Treat as UTC
        if 'T' in timestamp_utc:
            # ISO format with potential Z
            timestamp_dt = datetime.fromisoformat(timestamp_utc.replace('Z', '+00:00'))
        else:
            # Space-separated format, assume UTC
            timestamp_dt = datetime.strptime(timestamp_utc, '%Y-%m-%d %H:%M:%S')
            # Make timezone-aware (UTC)
            from datetime import timezone
            timestamp_dt = timestamp_dt.replace(tzinfo=timezone.utc)
        
        # Calculate hours before game start
        hours_before_game = (game_start_dt - timestamp_dt).total_seconds() / 3600
        
        # Include prices from 48 hours to 0 hours before game start
        if 0 <= hours_before_game <= 48:
            # Invert price if tracked team is away
            if is_team_away:
                price = 100.0 - price
            prices_in_window.append(price)
    
    conn.close()
    
    if prices_in_window:
        return sum(prices_in_window) / len(prices_in_window)
    else:
        return None


def get_final_price(game_id: int, team_abbrev: str = "PHI") -> Optional[float]:
    """Get the final price (most recent price in the price history series).
    
    Args:
        game_id: Game ID
        team_abbrev: Team abbreviation (e.g., 'PHI', 'DET')
        
    Returns:
        Final price, or None if no data available
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get game info
    cursor.execute("""
        SELECT slug FROM games WHERE id = ?
    """, (game_id,))
    game_row = cursor.fetchone()
    if not game_row:
        conn.close()
        return None
    
    slug = game_row['slug']
    
    # Check if tracked team is away (second position in slug)
    is_team_away = get_team_from_slug(slug, team_abbrev)
    
    # Get the most recent price (last in the series)
    cursor.execute("""
        SELECT price
        FROM price_history
        WHERE game_id = ?
        ORDER BY timestamp_utc DESC
        LIMIT 1
    """, (game_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        price = row['price']
        # Invert price if tracked team is away
        if is_team_away:
            price = 100.0 - price
        
        # Clean up final price values
        if price > 95:
            price = 100.0
        elif price < 1:
            price = 0.0
        
        return price
    
    return None


def generate_game_analysis_dataset(team_abbrev: str = "PHI") -> List[Dict[str, Any]]:
    """Generate analysis dataset with game details, avg price, final price, and ROI.
    
    Args:
        team_abbrev: Team abbreviation (e.g., 'PHI', 'DET')
        
    Returns:
        List of game analysis dictionaries
    """
    games = get_all_games(team_abbrev=team_abbrev)
    analysis_data = []
    
    for game in games:
        game_id = game['id']
        avg_48h = calculate_48h_average_price(game_id, team_abbrev)
        final_price = get_final_price(game_id, team_abbrev)
        
        # Calculate ROI
        roi = None
        if avg_48h is not None and final_price is not None:
            # Assume binary outcome: final_price near 100 = win, near 0 = loss
            # For simplicity, we'll use the actual final price as the outcome
            # If game resolved (price at 0 or 100), calculate ROI
            if final_price >= 99:
                # Win: bought at avg_48h, value is now 100
                roi = ((100 - avg_48h) / avg_48h) * 100
            elif final_price <= 1:
                # Loss: bought at avg_48h, value is now 0
                roi = -100.0
            else:
                # Game not yet resolved or price in between
                roi = ((final_price - avg_48h) / avg_48h) * 100
        
        analysis_data.append({
            'game_id': game_id,
            'game_date': game['game_date'],
            'slug': game['slug'],
            'game_start_utc': game['game_start_utc'],
            'avg_48h_price': avg_48h,
            'final_price': final_price,
            'roi_percent': roi
        })
    
    return analysis_data


def save_analysis_dataset_to_csv(output_path: str = "game_analysis.csv", team_abbrev: str = "PHI"):
    """Save game analysis dataset to CSV file.
    
    Args:
        output_path: Path to output CSV file
        team_abbrev: Team abbreviation (e.g., 'PHI', 'DET')
    """
    analysis_data = generate_game_analysis_dataset(team_abbrev)
    
    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'game_id', 'game_date', 'slug', 'game_start_utc',
            'avg_48h_price', 'final_price', 'roi_percent'
        ])
        writer.writeheader()
        writer.writerows(analysis_data)
    
    logger.info(f"Game analysis dataset saved to {output_path}")


def run_backtest(initial_capital: float = 10000.0, bet_percentage: float = 0.02, team_abbrev: str = "PHI") -> List[Dict[str, Any]]:
    """Run backtest simulation betting fixed percentage of bankroll on each game.
    
    Args:
        initial_capital: Starting capital ($10,000 default)
        bet_percentage: Percentage of bankroll to bet on each game (2% default)
        team_abbrev: Team abbreviation (e.g., 'PHI', 'DET')
        
    Returns:
        List of backtest results with game info and running bankroll
    """
    analysis_data = generate_game_analysis_dataset(team_abbrev)
    
    # Filter out games without ROI data
    valid_games = [g for g in analysis_data if g['roi_percent'] is not None]
    
    # Sort by game date
    valid_games.sort(key=lambda x: x['game_date'])
    
    bankroll = initial_capital
    backtest_results = []
    
    for game in valid_games:
        # Calculate bet size (2% of current bankroll)
        bet_size = bankroll * bet_percentage
        
        # Calculate profit/loss based on ROI
        roi_decimal = game['roi_percent'] / 100.0
        profit_loss = bet_size * roi_decimal
        
        # Update bankroll
        bankroll += profit_loss
        
        backtest_results.append({
            'game_id': game['game_id'],
            'game_date': game['game_date'],
            'slug': game['slug'],
            'avg_48h_price': game['avg_48h_price'],
            'final_price': game['final_price'],
            'roi_percent': game['roi_percent'],
            'bet_size': bet_size,
            'profit_loss': profit_loss,
            'bankroll': bankroll
        })
    
    return backtest_results


if __name__ == "__main__":
    # Initialize and load all game data
    import sys
    logging.basicConfig(level=logging.INFO)
    init_database()
    
    # Load from the consolidated all-games CSV file
    csv_file = "price_history/price_history_all.csv"
    
    load_csv_to_database(csv_file)
    print("Database initialized and loaded all game data successfully!")
    
    # Generate analysis dataset for all teams
    save_analysis_dataset_to_csv()
    print("Game analysis dataset generated!")
