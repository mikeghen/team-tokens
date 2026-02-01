"""
Data writing utilities for price history extraction.
"""
import csv
import os
import logging
from datetime import datetime
from typing import List, Dict, Any

from config import OUTPUT_DIR

logger = logging.getLogger(__name__)


class PriceHistoryWriter:
    """Handles writing price history data to CSV files."""

    def __init__(self, output_dir: str = OUTPUT_DIR):
        """Initialize the price history writer.
        
        Args:
            output_dir: Directory to write CSV files to
        """
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def build_filename(self, slug: str, game_date: str) -> str:
        """Build a filename from slug and game date.
        
        Args:
            slug: Market slug identifier
            game_date: Game date string (YYYY-MM-DD)
            
        Returns:
            Formatted filename
        """
        parts = slug.split("-")
        
        # Remove date components from slug if present (last 3 parts if all digits)
        if len(parts) >= 3 and all(p.isdigit() for p in parts[-3:]):
            slug_base = "-".join(parts[:-3])
        else:
            slug_base = slug
        
        return f"{game_date}_{slug_base}_history.csv"

    def write_price_history(
        self,
        slug: str,
        game_date: str,
        history: List[Dict[str, Any]]
    ) -> str:
        """Write price history to CSV file.
        
        Args:
            slug: Market slug identifier
            game_date: Game date string (YYYY-MM-DD)
            history: List of price history entries with 't' and 'p' keys
            
        Returns:
            Path to written file
        """
        filename = self.build_filename(slug, game_date)
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['time', 'price'])
            writer.writeheader()
            
            for entry in history:
                # 't' is timestamp, 'p' is price in the JSON response
                readable_time = datetime.fromtimestamp(entry['t']).strftime('%Y-%m-%d %H:%M:%S')
                writer.writerow({
                    'time': readable_time,
                    'price': round(float(entry['p']) * 100, 2)
                })
        
        logger.info("Saved history CSV", extra={"file": filepath, "points": len(history)})
        return filepath
