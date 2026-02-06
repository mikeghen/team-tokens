# Unexpected Sports Market Backend

This backend extracts historical pricing data for Philadelphia 76ers games from Polymarket prediction markets.

## Overview

The script fetches price history for each Sixers game during the 48 hours leading up to the game start time, using Polymarket's Gamma and CLOB APIs. The data is saved as CSV files with timestamps and prices.

## Project Structure

```
backend/
├── main.py                 # Main orchestration script
├── config.py              # Configuration and game schedule
├── polymarket_client.py   # Polymarket API client
├── data_writer.py         # CSV writing utilities
├── price_history/         # Output directory for CSV files
└── README.md             # This file
```

## Setup

### Prerequisites

- Python 3.7+
- `requests` library

### Installation

```bash
# Install dependencies
pip install requests
```

## Usage

Run the extraction script:

```bash
python main.py
```

The script will:
1. Iterate through all Sixers games in the schedule
2. Fetch the market token ID for each game
3. Retrieve price history (48 hours before to 12 hours after game time)
4. Save data to CSV files in `price_history/`

### Output Format

CSV files are named: `{game_date}_{teams}_history.csv`

Example: `2025-10-22_nba-phi-bos_history.csv`

Each CSV contains:
- `time`: Timestamp in `YYYY-MM-DD HH:MM:SS` format
- `price`: Market price as percentage (0-100)

In addition, a consolidated file is created for easier analysis:
- `price_history_all.csv` containing all games with columns:
   `game_date`, `slug`, `game_start_utc`, `token_id`, `timestamp_utc`, `price`, `fidelity_minutes`

## Configuration

Edit `config.py` to customize:

- **API Endpoints**: Gamma and CLOB base URLs
- **Time Window**: Hours before/after game to fetch prices
- **Price Fidelity**: Time resolution (default: 60 minutes)
- **Output Directory**: Where to save CSV files
- **Game Schedule**: List of Sixers games to process
- **Rate Limiting**: Delay between API requests

## Architecture

### Components

1. **`config.py`**: Centralized configuration
   - API endpoints
   - Game schedule
   - Extraction parameters

2. **`polymarket_client.py`**: API interaction layer
   - `PolymarketClient` class handles all API calls
   - Fetches token IDs from market slugs
   - Retrieves price history data
   - Handles error cases and logging

3. **`data_writer.py`**: Data persistence layer
   - `PriceHistoryWriter` class manages CSV output
   - Formats filenames consistently
   - Converts timestamps to readable format
   - Creates output directory if needed

4. **`main.py`**: Application entry point
   - Orchestrates the extraction workflow
   - Iterates through game schedule
   - Coordinates client and writer components
   - Implements rate limiting

## API Reference

### Gamma API
- **Endpoint**: `https://gamma-api.polymarket.com/markets/slug/{slug}`
- **Purpose**: Get market metadata and CLOB token IDs
- **Response**: Market details including `clobTokenIds` array

### CLOB API
- **Endpoint**: `https://clob.polymarket.com/prices-history`
- **Purpose**: Get historical price data for a market
- **Parameters**:
  - `market`: Token ID
  - `startTs`: Start timestamp (Unix)
  - `endTs`: End timestamp (Unix)
  - `fidelity`: Time resolution in minutes
- **Response**: Object with `history` array containing `{t: timestamp, p: price}` entries

## Logging

The application uses structured logging with the following levels:
- **INFO**: Progress updates and successful operations
- **DEBUG**: Detailed API interactions and data parsing
- **WARNING**: Missing data or skipped games
- **ERROR**: API failures or parsing errors

Logs include contextual information (slugs, token IDs, etc.) for debugging.

## Error Handling

The script is designed to be resilient:
- Continues processing if individual games fail
- Logs detailed error information
- Handles malformed API responses
- Implements request timeouts
- Respects rate limits with delays

## Future Enhancements

Potential improvements:
- Command-line arguments for filtering games
- Parallel processing with rate limit management
- Database storage instead of CSV files
- Real-time streaming updates
- Support for other teams/sports
- Retry logic with exponential backoff
- Progress bars for long-running extractions

## License

See parent repository for license information.

## Data References

