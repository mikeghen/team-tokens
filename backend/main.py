"""
Main script for extracting NBA team price history from Polymarket.

This script fetches historical pricing data for NBA team games
from the Polymarket prediction markets and saves them to CSV files.
"""
import logging
import time

from config import ALL_GAMES, LOG_LEVEL, LOG_FORMAT, REQUEST_DELAY_SECONDS, log_game_data_error
from polymarket_client import PolymarketClient
from data_writer import PriceHistoryWriter

# Configure logging
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)


def run_extraction(slug: str = None):
    """Extract price history for games.
    
    Args:
        slug: Specific game slug to process, or None for all games
    """
    if slug:
        # Process single game
        games_to_process = [g for g in ALL_GAMES if g['slug'] == slug]
        if not games_to_process:
            logger.error(f"Unknown game slug: {slug}")
            return
    else:
        # Process all unique games
        games_to_process = ALL_GAMES
    
    logger.info(f"Starting Price History Extraction for {len(games_to_process)} games")
    
    client = PolymarketClient()
    writer = PriceHistoryWriter()
    
    for game in games_to_process:
        slug = game['slug']
        logger.info("Processing game", extra={"slug": slug})
        
        # Step 1: Get token ID from slug
        token_id = client.get_token_id_from_slug(slug)
        if not token_id:
            logger.warning("No token id resolved", extra={"slug": slug})
            log_game_data_error(slug, "No token ID resolved from Polymarket")
            continue
        
        logger.info("Token ID", extra={"token_id": token_id})
        
        # Step 2: Get price history
        history = client.get_price_history(token_id, game['start_iso'])
        
        # Step 3: Write to CSV
        if history:
            game_date = game['start_iso'][:10]
            writer.write_price_history(slug, game_date, history)
            writer.write_consolidated_history(
                slug=slug,
                game_date=game_date,
                game_start_iso=game['start_iso'],
                token_id=token_id,
                history=history
            )
        else:
            logger.warning("No price history found", extra={"slug": slug, "token_id": token_id})
            log_game_data_error(slug, f"No price history found for token_id {token_id}")
        
        # Rate limiting
        time.sleep(REQUEST_DELAY_SECONDS)
    
    logger.info(f"Price history extraction complete")


if __name__ == "__main__":
    import sys
    # Allow optional game slug argument: python main.py nba-phi-bos-2025-10-22
    slug = sys.argv[1] if len(sys.argv) > 1 else None
    run_extraction(slug)