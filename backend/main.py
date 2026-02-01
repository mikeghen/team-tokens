import requests
import csv
from datetime import datetime, timedelta
import time
import logging
import json
import ast
import os

# --- CONFIGURATION ---
# Verified 2025-26 Philadelphia 76ers Regular Season Schedule
# Sources: NBA.com, Basketball-Reference, CBS Sports
SIXERS_GAMES = [
    {"slug": "nba-phi-bos-2025-10-22", "start_iso": "2025-10-22T23:30:00Z"},
    {"slug": "nba-cha-phi-2025-10-25", "start_iso": "2025-10-25T23:30:00Z"},
    {"slug": "nba-orl-phi-2025-10-27", "start_iso": "2025-10-27T23:00:00Z"},
    {"slug": "nba-phi-was-2025-10-28", "start_iso": "2025-10-28T23:00:00Z"},
    {"slug": "nba-bos-phi-2025-10-31", "start_iso": "2025-10-31T23:00:00Z"},
    {"slug": "nba-phi-bkn-2025-11-02", "start_iso": "2025-11-02T23:00:00Z"},
    {"slug": "nba-phi-chi-2025-11-04", "start_iso": "2025-11-05T01:00:00Z"},
    {"slug": "nba-phi-cle-2025-11-05", "start_iso": "2025-11-06T00:00:00Z"},
    {"slug": "nba-tor-phi-2025-11-08", "start_iso": "2025-11-09T00:30:00Z"},
    {"slug": "nba-det-phi-2025-11-09", "start_iso": "2025-11-10T00:30:00Z"},
    {"slug": "nba-bos-phi-2025-11-11", "start_iso": "2025-11-12T01:00:00Z"},
    {"slug": "nba-phi-det-2025-11-14", "start_iso": "2025-11-15T00:30:00Z"},
    {"slug": "nba-lac-phi-2025-11-17", "start_iso": "2025-11-18T00:00:00Z"},
    {"slug": "nba-tor-phi-2025-11-19", "start_iso": "2025-11-20T00:00:00Z"},
    {"slug": "nba-phi-mil-2025-11-20", "start_iso": "2025-11-21T01:00:00Z"},
    {"slug": "nba-mia-phi-2025-11-23", "start_iso": "2025-11-23T18:00:00Z"},
    {"slug": "nba-orl-phi-2025-11-25", "start_iso": "2025-11-26T01:00:00Z"},
    {"slug": "nba-phi-bkn-2025-11-28", "start_iso": "2025-11-29T00:30:00Z"},
    {"slug": "nba-atl-phi-2025-11-30", "start_iso": "2025-11-30T23:00:00Z"},
    {"slug": "nba-was-phi-2025-12-02", "start_iso": "2025-12-03T00:00:00Z"},
    {"slug": "nba-gsw-phi-2025-12-04", "start_iso": "2025-12-05T00:00:00Z"},
    {"slug": "nba-phi-mil-2025-12-05", "start_iso": "2025-12-06T01:00:00Z"},
    {"slug": "nba-lal-phi-2025-12-07", "start_iso": "2025-12-08T00:30:00Z"},
    {"slug": "nba-ind-phi-2025-12-12", "start_iso": "2025-12-13T00:00:00Z"},
    {"slug": "nba-phi-atl-2025-12-14", "start_iso": "2025-12-14T23:00:00Z"},
    {"slug": "nba-phi-nyk-2025-12-19", "start_iso": "2025-12-20T00:00:00Z"},
    {"slug": "nba-dal-phi-2025-12-20", "start_iso": "2025-12-21T00:00:00Z"},
    {"slug": "nba-bkn-phi-2025-12-23", "start_iso": "2025-12-24T00:00:00Z"},
    {"slug": "nba-phi-chi-2025-12-26", "start_iso": "2025-12-27T00:30:00Z"},
    {"slug": "nba-phi-okc-2025-12-28", "start_iso": "2025-12-28T20:30:00Z"},
    {"slug": "nba-phi-mem-2025-12-30", "start_iso": "2025-12-31T01:00:00Z"},
    {"slug": "nba-phi-dal-2026-01-01", "start_iso": "2026-01-02T01:30:00Z"},
    {"slug": "nba-phi-nyk-2026-01-03", "start_iso": "2026-01-04T00:30:00Z"},
    {"slug": "nba-den-phi-2026-01-05", "start_iso": "2026-01-06T00:00:00Z"},
    {"slug": "nba-was-phi-2026-01-07", "start_iso": "2026-01-08T00:00:00Z"},
    {"slug": "nba-phi-orl-2026-01-09", "start_iso": "2026-01-10T00:00:00Z"},
    {"slug": "nba-phi-tor-2026-01-11", "start_iso": "2026-01-12T01:00:00Z"},
    {"slug": "nba-phi-tor-2026-01-12", "start_iso": "2026-01-13T01:00:00Z"},
    {"slug": "nba-cle-phi-2026-01-14", "start_iso": "2026-01-15T00:00:00Z"},
    {"slug": "nba-cle-phi-2026-01-16", "start_iso": "2026-01-17T00:00:00Z"},
    {"slug": "nba-ind-phi-2026-01-19", "start_iso": "2026-01-20T00:00:00Z"},
    {"slug": "nba-phx-phi-2026-01-20", "start_iso": "2026-01-21T00:00:00Z"},
    {"slug": "nba-hou-phi-2026-01-22", "start_iso": "2026-01-23T00:00:00Z"},
    {"slug": "nba-nyk-phi-2026-01-24", "start_iso": "2026-01-25T00:00:00Z"},
    {"slug": "nba-phi-cha-2026-01-26", "start_iso": "2026-01-27T00:00:00Z"},
    {"slug": "nba-mil-phi-2026-01-27", "start_iso": "2026-01-28T00:00:00Z"},
    {"slug": "nba-sac-phi-2026-01-29", "start_iso": "2026-01-30T00:00:00Z"},
    {"slug": "nba-nop-phi-2026-01-31", "start_iso": "2026-02-01T00:30:00Z"},
    {"slug": "nba-phi-lac-2026-02-02", "start_iso": "2026-02-03T03:00:00Z"},
    {"slug": "nba-phi-gsw-2026-02-03", "start_iso": "2026-02-04T03:00:00Z"},
    # {"slug": "nba-phi-lal-2026-02-05", "start_iso": "2026-02-06T03:00:00Z"},
    # {"slug": "nba-phi-phx-2026-02-07", "start_iso": "2026-02-08T02:00:00Z"},
    # {"slug": "nba-phi-por-2026-02-09", "start_iso": "2026-02-10T03:00:00Z"},
    # {"slug": "nba-nyk-phi-2026-02-11", "start_iso": "2026-02-12T00:30:00Z"},
    # {"slug": "nba-atl-phi-2026-02-19", "start_iso": "2026-02-20T00:00:00Z"},
    # {"slug": "nba-phi-nop-2026-02-21", "start_iso": "2026-02-22T00:00:00Z"},
    # {"slug": "nba-phi-min-2026-02-22", "start_iso": "2026-02-23T00:00:00Z"},
    # {"slug": "nba-phi-ind-2026-02-24", "start_iso": "2026-02-25T00:00:00Z"},
    # {"slug": "nba-mia-phi-2026-02-26", "start_iso": "2026-02-27T00:00:00Z"},
    # {"slug": "nba-phi-bos-2026-03-01", "start_iso": "2026-03-01T23:00:00Z"},
    # {"slug": "nba-sas-phi-2026-03-03", "start_iso": "2026-03-04T01:00:00Z"},
    # {"slug": "nba-uta-phi-2026-03-04", "start_iso": "2026-03-05T00:30:00Z"},
    # {"slug": "nba-phi-atl-2026-03-07", "start_iso": "2026-03-08T00:30:00Z"},
    # {"slug": "nba-phi-cle-2026-03-09", "start_iso": "2026-03-10T00:00:00Z"},
    # {"slug": "nba-mem-phi-2026-03-10", "start_iso": "2026-03-11T00:00:00Z"},
    # {"slug": "nba-phi-det-2026-03-12", "start_iso": "2026-03-13T00:00:00Z"},
    # {"slug": "nba-bkn-phi-2026-03-14", "start_iso": "2026-03-14T17:00:00Z"},
    # {"slug": "nba-por-phi-2026-03-15", "start_iso": "2026-03-15T22:00:00Z"},
    # {"slug": "nba-phi-den-2026-03-17", "start_iso": "2026-03-18T00:00:00Z"},
    # {"slug": "nba-phi-sac-2026-03-19", "start_iso": "2026-03-20T00:00:00Z"},
    # {"slug": "nba-phi-uta-2026-03-21", "start_iso": "2026-03-21T23:30:00Z"},
    # {"slug": "nba-okc-phi-2026-03-23", "start_iso": "2026-03-23T23:00:00Z"},
    # {"slug": "nba-chi-phi-2026-03-25", "start_iso": "2026-03-25T23:00:00Z"},
    # {"slug": "nba-phi-cha-2026-03-28", "start_iso": "2026-03-28T22:00:00Z"},
    # {"slug": "nba-phi-mia-2026-03-30", "start_iso": "2026-03-31T00:00:00Z"},
    # {"slug": "nba-phi-was-2026-04-01", "start_iso": "2026-04-01T23:00:00Z"},
    # {"slug": "nba-min-phi-2026-04-03", "start_iso": "2026-04-03T23:00:00Z"},
    # {"slug": "nba-det-phi-2026-04-04", "start_iso": "2026-04-04T23:00:00Z"},
    # {"slug": "nba-phi-sas-2026-04-06", "start_iso": "2026-04-06T23:00:00Z"},
    # {"slug": "nba-phi-hou-2026-04-09", "start_iso": "2026-04-09T23:00:00Z"},
    # {"slug": "nba-phi-ind-2026-04-10", "start_iso": "2026-04-10T23:30:00Z"},
    # {"slug": "nba-mil-phi-2026-04-12", "start_iso": "2026-04-12T22:00:00Z"},
]

LOG_LEVEL = logging.DEBUG
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "price_history")

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger(__name__)

def build_filename(slug, game_date):
    parts = slug.split("-")
    if len(parts) >= 3 and parts[-3].isdigit() and parts[-2].isdigit() and parts[-1].isdigit():
        slug_base = "-".join(parts[:-3])
    else:
        slug_base = slug
    return f"{game_date}_{slug_base}_history.csv"

def get_token_id_from_slug(slug):
    """
    Step 1: Get market CLOB token ID from Gamma slug endpoint.
    Ref: Screenshot 2026-02-01 at 4.08.03 PM.png
    """
    url = f"https://gamma-api.polymarket.com/markets/slug/{slug}"
    try:
        logger.info("Requesting Gamma market by slug", extra={"slug": slug, "url": url})
        response = requests.get(url, timeout=10)
        logger.debug("Gamma response", extra={"status": response.status_code})
        if response.status_code == 200:
            data = response.json()
            logger.debug("Gamma payload keys", extra={"keys": list(data.keys())})
            # clobTokenIds is typically a list; index 0 is usually 'Yes'
            token_ids = data.get('clobTokenIds', [])

            # Normalize possible stringified lists
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

            logger.debug("Parsed clobTokenIds", extra={"type": type(token_ids).__name__, "value": token_ids})

            if isinstance(token_ids, list) and token_ids:
                token_id = token_ids[0]
                logger.info("Resolved token id", extra={"token_id": token_id})
                return token_id
        else:
            logger.error("Gamma API error", extra={"status": response.status_code, "slug": slug, "body": response.text[:500]})
    except Exception as e:
        logger.exception("Error fetching slug", extra={"slug": slug})
    return None

def get_price_history(token_id, game_time_iso):
    """
    Step 2: Get price history for the 48 hours before the game.
    Ref: Screenshot 2026-02-01 at 4.07.26 PM.png
    """
    url = "https://clob.polymarket.com/prices-history"
    
    # Calculate time window (48 hours before game)
    game_dt = datetime.fromisoformat(game_time_iso.replace('Z', '+00:00'))
    end_ts = int((game_dt + timedelta(hours=12)).timestamp())
    start_ts = int((game_dt - timedelta(hours=48)).timestamp())
    
    params = {
        "market": token_id,
        "startTs": start_ts,
        "endTs": end_ts,
        "fidelity": 60  # Hourly resolution as seen in screenshots
    }
    
    try:
        logger.info("Requesting price history", extra={"url": url, "params": params})
        response = requests.get(url, params=params, timeout=10)
        logger.debug("CLOB response", extra={"status": response.status_code})
        if response.status_code == 200:
            # The API returns a dictionary with a 'history' key
            payload = response.json()
            history = payload.get('history', [])
            logger.info("Received price history", extra={"points": len(history)})
            return history
        else:
            logger.error("CLOB API error", extra={"status": response.status_code, "token": token_id, "body": response.text[:500]})
    except Exception as e:
        logger.exception("Error fetching history", extra={"token": token_id})
    return []

def run_extraction():
    logger.info("Starting Sixers Price History Extraction", extra={"games": len(SIXERS_GAMES)})
    
    for game in SIXERS_GAMES:
        slug = game['slug']
        logger.info("Processing game", extra={"slug": slug})
        
        token_id = get_token_id_from_slug(slug)
        if not token_id:
            logger.warning("No token id resolved", extra={"slug": slug})
            continue
            
        logger.info("Token ID", extra={"token_id": token_id})
        history = get_price_history(token_id, game['start_iso'])
        
        if history:
            game_date = game['start_iso'][:10]
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            filename = build_filename(slug, game_date)
            filepath = os.path.join(OUTPUT_DIR, filename)
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
        else:
            logger.warning("No price history found", extra={"slug": slug, "token_id": token_id})
        
        # Polite delay to respect rate limits
        time.sleep(1)

if __name__ == "__main__":
    run_extraction()