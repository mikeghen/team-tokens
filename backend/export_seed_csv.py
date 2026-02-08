#!/usr/bin/env python3
"""
Export price history from the SQLite database into the CSV format
expected by the Solidity Seed script (contracts/script/seed_data.csv).

Seed CSV columns:
  slug, homeTeam, awayTeam, gameTimeHoursAgo, homeWin, obsHoursAgo, yesPrice, noPrice

Usage:
    python export_seed_csv.py                          # writes to contracts/script/seed_data.csv
    python export_seed_csv.py -o my_seed.csv           # writes to a custom path
    python export_seed_csv.py --team PHI               # only games involving PHI
"""
import argparse
import csv
import math
import os
import sqlite3
import sys
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DB_PATH = os.path.join(os.path.dirname(__file__), "price_history.db")
DEFAULT_OUTPUT = os.path.join(
    os.path.dirname(__file__), "..", "contracts", "script", "seed_data.csv"
)
WEI = 10**18  # 1 ether in wei – prices are stored as 18-decimal fixed-point


def parse_slug(slug: str):
    """Parse an NBA slug into (home_abbrev, away_abbrev).

    Slug format: nba-{home}-{away}-YYYY-MM-DD
    Returns uppercase abbreviations, e.g. ("PHI", "DAL").
    """
    parts = slug.split("-")
    if len(parts) < 4 or parts[0] != "nba":
        return None, None
    home = parts[1].upper()
    away = parts[2].upper()
    return home, away


def price_pct_to_wei(price_pct: float) -> int:
    """Convert a 0-100 percentage price to an 18-decimal wei integer.

    Example: 40.0  ->  400000000000000000
             100.0 -> 1000000000000000000
    """
    return int(round(price_pct / 100.0 * WEI))


def determine_home_win(final_price_pct: float) -> bool:
    """Determine if the home team won based on the final (resolved) price.

    The DB stores prices from the perspective of the *home* team (first in slug).
    A resolved market settles near 100 (home win) or near 0 (home loss).
    """
    if final_price_pct >= 95:
        return True
    if final_price_pct <= 5:
        return False
    # Game hasn't resolved cleanly – default to false
    return False


def export_seed_csv(db_path: str, output_path: str, team_filter: str = None):
    """Read the database and write the seed CSV.

    Args:
        db_path: Path to the SQLite database.
        output_path: Destination CSV path.
        team_filter: Optional team abbreviation to filter games (e.g. "PHI").
    """
    if not os.path.exists(db_path):
        print(f"Error: database not found at {db_path}", file=sys.stderr)
        print("Run the backend data pipeline first to create the database.", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    # ------------------------------------------------------------------
    # 1. Fetch all games (optionally filtered by team)
    # ------------------------------------------------------------------
    if team_filter:
        team_lower = team_filter.lower()
        games = conn.execute(
            """
            SELECT id, slug, game_start_utc
            FROM games
            WHERE slug LIKE ? OR slug LIKE ?
            ORDER BY game_date ASC
            """,
            (f"nba-{team_lower}-%", f"nba-%-{team_lower}-%"),
        ).fetchall()
    else:
        games = conn.execute(
            """
            SELECT id, slug, game_start_utc
            FROM games
            ORDER BY game_date ASC
            """
        ).fetchall()

    if not games:
        print("No games found in the database.", file=sys.stderr)
        conn.close()
        sys.exit(1)

    now = datetime.now(timezone.utc)
    rows_written = 0

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "slug",
            "homeTeam",
            "awayTeam",
            "gameTimeHoursAgo",
            "homeWin",
            "obsHoursAgo",
            "yesPrice",
            "noPrice",
        ])

        for game in games:
            game_id = game["id"]
            slug = game["slug"]
            game_start_utc = game["game_start_utc"]

            home, away = parse_slug(slug)
            if home is None:
                continue

            # Parse game start time
            if game_start_utc.endswith("Z"):
                game_dt = datetime.fromisoformat(game_start_utc.replace("Z", "+00:00"))
            elif "T" in game_start_utc:
                game_dt = datetime.fromisoformat(game_start_utc)
            else:
                game_dt = datetime.strptime(game_start_utc, "%Y-%m-%d %H:%M:%S").replace(
                    tzinfo=timezone.utc
                )

            game_hours_ago = max(0, int(math.ceil((now - game_dt).total_seconds() / 3600)))

            # Fetch price history for this game (ordered chronologically)
            price_rows = conn.execute(
                """
                SELECT timestamp_utc, price
                FROM price_history
                WHERE game_id = ?
                ORDER BY timestamp_utc ASC
                """,
                (game_id,),
            ).fetchall()

            if not price_rows:
                continue

            # Determine home win from the last recorded price
            final_price = price_rows[-1]["price"]
            home_win = determine_home_win(final_price)
            home_win_str = "true" if home_win else "false"

            for row in price_rows:
                ts_utc = row["timestamp_utc"]
                price_pct = row["price"]  # 0-100, home-team perspective

                # Parse observation timestamp
                if "T" in ts_utc:
                    obs_dt = datetime.fromisoformat(ts_utc.replace("Z", "+00:00"))
                else:
                    obs_dt = datetime.strptime(ts_utc, "%Y-%m-%d %H:%M:%S").replace(
                        tzinfo=timezone.utc
                    )

                obs_hours_ago = max(0, int(math.ceil((now - obs_dt).total_seconds() / 3600)))

                yes_price = price_pct_to_wei(price_pct)
                no_price = WEI - yes_price  # yes + no = 1 ETH

                writer.writerow([
                    slug,
                    home,
                    away,
                    game_hours_ago,
                    home_win_str,
                    obs_hours_ago,
                    yes_price,
                    no_price,
                ])
                rows_written += 1

    conn.close()

    output_abs = os.path.abspath(output_path)
    print(f"Exported {rows_written} observations across {len(games)} games")
    print(f"  -> {output_abs}")


def main():
    parser = argparse.ArgumentParser(
        description="Export DB price history to Seed.sol CSV format."
    )
    parser.add_argument(
        "-o", "--output",
        default=DEFAULT_OUTPUT,
        help="Output CSV path (default: contracts/script/seed_data.csv)",
    )
    parser.add_argument(
        "--db",
        default=DB_PATH,
        help="Path to the SQLite database (default: backend/price_history.db)",
    )
    parser.add_argument(
        "--team",
        default="PHI",
        help="Filter to games involving this team abbreviation (default: PHI)",
    )
    args = parser.parse_args()

    export_seed_csv(args.db, args.output, args.team)


if __name__ == "__main__":
    main()
