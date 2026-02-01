"""
Database module for price history storage.
"""
import sqlite3
import csv
import logging
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

DB_PATH = "price_history.db"


def init_database():
    """Initialize the SQLite database with schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create games table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        CREATE INDEX IF NOT EXISTS idx_price_history_game_timestamp 
        ON price_history(game_id, timestamp_utc)
    """)
    
    conn.commit()
    conn.close()
    logger.info("Database initialized", extra={"db_path": DB_PATH})


def load_csv_to_database(csv_path: str):
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
            
            # Insert or get game
            if slug not in games_cache:
                cursor.execute("""
                    INSERT INTO games (game_date, slug, game_start_utc, token_id)
                    VALUES (?, ?, ?, ?)
                """, (row['game_date'], slug, row['game_start_utc'], row['token_id']))
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


def get_all_games() -> List[Dict[str, Any]]:
    """Get all games from database.
    
    Returns:
        List of game dictionaries
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, game_date, slug, game_start_utc, token_id
        FROM games
        ORDER BY game_date ASC
    """)
    
    games = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return games


def get_price_history(game_id: int) -> List[Dict[str, Any]]:
    """Get price history for a specific game.
    
    Automatically inverts prices when PHI is the away team (second team in slug)
    so that prices always represent the probability of PHI winning.
    
    Args:
        game_id: Game ID
        
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
    # Parse slug format: nba-team1-team2-date or nba-team1-team2
    parts = slug.split('-')
    # PHI is away team if it's the second team (index 2 in slug parts)
    is_phi_away = len(parts) >= 3 and parts[2].lower() == 'phi'
    
    cursor.execute("""
        SELECT timestamp_utc, price, fidelity_minutes
        FROM price_history
        WHERE game_id = ?
        ORDER BY timestamp_utc ASC
    """, (game_id,))
    
    history = []
    for row in cursor.fetchall():
        entry = dict(row)
        # Invert price if PHI is away team (so price always represents PHI's win probability)
        if is_phi_away:
            entry['price'] = 100.0 - entry['price']
        history.append(entry)
    
    conn.close()
    
    return history


def calculate_48h_average_price(game_id: int) -> float:
    """Calculate the average price in the 48 hours leading up to game start.
    
    Args:
        game_id: Game ID
        
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
    
    # Parse slug to determine if we need to invert prices
    parts = slug.split('-')
    is_phi_away = len(parts) >= 3 and parts[2].lower() == 'phi'
    
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
            # Invert price if PHI is away team
            if is_phi_away:
                price = 100.0 - price
            prices_in_window.append(price)
    
    conn.close()
    
    if prices_in_window:
        return sum(prices_in_window) / len(prices_in_window)
    else:
        return None


if __name__ == "__main__":
    # Initialize and load data
    logging.basicConfig(level=logging.INFO)
    init_database()
    load_csv_to_database("price_history/price_history_all.csv")
    print("Database initialized and loaded successfully!")
