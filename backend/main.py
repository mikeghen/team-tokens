"""
Main script for extracting Sixers price history from Polymarket.

This script fetches historical pricing data for Philadelphia 76ers games
from the Polymarket prediction markets and saves them to CSV files.
"""
import logging
import time

from config import SIXERS_GAMES, LOG_LEVEL, LOG_FORMAT, REQUEST_DELAY_SECONDS
from polymarket_client import PolymarketClient
from data_writer import PriceHistoryWriter

# Configure logging
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)


def run_extraction():
    """Extract price history for all Sixers games."""
    logger.info("Starting Sixers Price History Extraction", extra={"games": len(SIXERS_GAMES)})
    
    client = PolymarketClient()
    writer = PriceHistoryWriter()
    
    for game in SIXERS_GAMES:
        slug = game['slug']
        logger.info("Processing game", extra={"slug": slug})
        
        # Step 1: Get token ID from slug
        token_id = client.get_token_id_from_slug(slug)
        if not token_id:
            logger.warning("No token id resolved", extra={"slug": slug})
            continue
        
        logger.info("Token ID", extra={"token_id": token_id})
        
        # Step 2: Get price history
        history = client.get_price_history(token_id, game['start_iso'])
        
        # Step 3: Write to CSV
        if history:
            game_date = game['start_iso'][:10]
            writer.write_price_history(slug, game_date, history)
        else:
            logger.warning("No price history found", extra={"slug": slug, "token_id": token_id})
        
        # Rate limiting
        time.sleep(REQUEST_DELAY_SECONDS)
    
    logger.info("Extraction complete")


if __name__ == "__main__":
    run_extraction()