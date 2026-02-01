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


if __name__ == "__main__":
    # Initialize and load data
    logging.basicConfig(level=logging.INFO)
    init_database()
    load_csv_to_database("price_history/price_history_all.csv")
    print("Database initialized and loaded successfully!")
