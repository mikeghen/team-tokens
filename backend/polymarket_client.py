"""
Polymarket API client for fetching market data and price history.
"""
import requests
import json
import ast
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from config import (
    GAMMA_API_BASE,
    CLOB_API_BASE,
    PRICE_WINDOW_HOURS_BEFORE,
    PRICE_WINDOW_HOURS_AFTER,
    PRICE_FIDELITY,
)

logger = logging.getLogger(__name__)


class PolymarketClient:
    """Client for interacting with Polymarket APIs."""

    def __init__(self, timeout: int = 10):
        """Initialize the Polymarket client.
        
        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = timeout

    def get_token_id_from_slug(self, slug: str) -> Optional[str]:
        """Get market CLOB token ID from Gamma slug endpoint.
        
        Args:
            slug: Market slug identifier
            
        Returns:
            Token ID string if found, None otherwise
        """
        url = f"{GAMMA_API_BASE}/markets/slug/{slug}"
        
        try:
            logger.info("Requesting Gamma market by slug", extra={"slug": slug, "url": url})
            response = requests.get(url, timeout=self.timeout)
            logger.debug("Gamma response", extra={"status": response.status_code})
            
            if response.status_code == 200:
                data = response.json()
                logger.debug("Gamma payload keys", extra={"keys": list(data.keys())})
                
                # clobTokenIds is typically a list; index 0 is usually 'Yes'
                token_ids = data.get('clobTokenIds', [])
                token_ids = self._normalize_token_ids(token_ids)
                
                if isinstance(token_ids, list) and token_ids:
                    token_id = token_ids[0]
                    logger.info("Resolved token id", extra={"token_id": token_id})
                    return token_id
            else:
                logger.error(
                    "Gamma API error",
                    extra={
                        "status": response.status_code,
                        "slug": slug,
                        "body": response.text[:500]
                    }
                )
        except Exception as e:
            logger.exception("Error fetching slug", extra={"slug": slug})
        
        return None

    def _normalize_token_ids(self, token_ids: Any) -> List[str]:
        """Normalize token IDs which may be a string representation of a list.
        
        Args:
            token_ids: Token IDs as list or stringified list
            
        Returns:
            List of token ID strings
        """
        if isinstance(token_ids, str):
            logger.debug("Gamma clobTokenIds is string", extra={"value": token_ids[:200]})
            try:
                token_ids = json.loads(token_ids)
            except Exception:
                try:
                    token_ids = ast.literal_eval(token_ids)
                except Exception as e:
                    logger.error("Failed to parse clobTokenIds string", extra={"error": str(e)})
                    token_ids = []
        
        logger.debug(
            "Parsed clobTokenIds",
            extra={"type": type(token_ids).__name__, "value": token_ids}
        )
        return token_ids

    def get_price_history(
        self,
        token_id: str,
        game_time_iso: str
    ) -> List[Dict[str, Any]]:
        """Get price history for a market token.
        
        Args:
            token_id: Market token identifier
            game_time_iso: Game start time in ISO format
            
        Returns:
            List of price history entries with 't' (timestamp) and 'p' (price)
        """
        url = f"{CLOB_API_BASE}/prices-history"
        
        # Calculate time window relative to game time
        game_dt = datetime.fromisoformat(game_time_iso.replace('Z', '+00:00'))
        end_ts = int((game_dt + timedelta(hours=PRICE_WINDOW_HOURS_AFTER)).timestamp())
        start_ts = int((game_dt - timedelta(hours=PRICE_WINDOW_HOURS_BEFORE)).timestamp())
        
        params = {
            "market": token_id,
            "startTs": start_ts,
            "endTs": end_ts,
            "fidelity": PRICE_FIDELITY
        }
        
        try:
            logger.info("Requesting price history", extra={"url": url, "params": params})
            response = requests.get(url, params=params, timeout=self.timeout)
            logger.debug("CLOB response", extra={"status": response.status_code})
            
            if response.status_code == 200:
                payload = response.json()
                history = payload.get('history', [])
                logger.info("Received price history", extra={"points": len(history)})
                return history
            else:
                logger.error(
                    "CLOB API error",
                    extra={
                        "status": response.status_code,
                        "token": token_id,
                        "body": response.text[:500]
                    }
                )
        except Exception as e:
            logger.exception("Error fetching history", extra={"token": token_id})
        
        return []
