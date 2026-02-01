"""
Configuration for Sixers Price History Extraction.
"""
import os
import logging

# API Endpoints
GAMMA_API_BASE = "https://gamma-api.polymarket.com"
CLOB_API_BASE = "https://clob.polymarket.com"

# Extraction Settings
PRICE_WINDOW_HOURS_BEFORE = 48
PRICE_WINDOW_HOURS_AFTER = 12
PRICE_FIDELITY = 60  # Hourly resolution

# File Settings
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "price_history")

# Logging
LOG_LEVEL = logging.DEBUG
LOG_FORMAT = "%(asctime)s | %(levelname)s | %(message)s"

# Rate Limiting
REQUEST_DELAY_SECONDS = 1

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
    {"slug": "nba-phi-lal-2026-02-05", "start_iso": "2026-02-06T03:00:00Z"},
    {"slug": "nba-phi-phx-2026-02-07", "start_iso": "2026-02-08T02:00:00Z"},
    {"slug": "nba-phi-por-2026-02-09", "start_iso": "2026-02-10T03:00:00Z"},
    {"slug": "nba-nyk-phi-2026-02-11", "start_iso": "2026-02-12T00:30:00Z"},
    {"slug": "nba-atl-phi-2026-02-19", "start_iso": "2026-02-20T00:00:00Z"},
    {"slug": "nba-phi-nop-2026-02-21", "start_iso": "2026-02-22T00:00:00Z"},
    {"slug": "nba-phi-min-2026-02-22", "start_iso": "2026-02-23T00:00:00Z"},
    {"slug": "nba-phi-ind-2026-02-24", "start_iso": "2026-02-25T00:00:00Z"},
    {"slug": "nba-mia-phi-2026-02-26", "start_iso": "2026-02-27T00:00:00Z"},
    {"slug": "nba-phi-bos-2026-03-01", "start_iso": "2026-03-01T23:00:00Z"},
    {"slug": "nba-sas-phi-2026-03-03", "start_iso": "2026-03-04T01:00:00Z"},
    {"slug": "nba-uta-phi-2026-03-04", "start_iso": "2026-03-05T00:30:00Z"},
    {"slug": "nba-phi-atl-2026-03-07", "start_iso": "2026-03-08T00:30:00Z"},
    {"slug": "nba-phi-cle-2026-03-09", "start_iso": "2026-03-10T00:00:00Z"},
    {"slug": "nba-mem-phi-2026-03-10", "start_iso": "2026-03-11T00:00:00Z"},
    {"slug": "nba-phi-det-2026-03-12", "start_iso": "2026-03-13T00:00:00Z"},
    {"slug": "nba-bkn-phi-2026-03-14", "start_iso": "2026-03-14T17:00:00Z"},
    {"slug": "nba-por-phi-2026-03-15", "start_iso": "2026-03-15T22:00:00Z"},
    {"slug": "nba-phi-den-2026-03-17", "start_iso": "2026-03-18T00:00:00Z"},
    {"slug": "nba-phi-sac-2026-03-19", "start_iso": "2026-03-20T00:00:00Z"},
    {"slug": "nba-phi-uta-2026-03-21", "start_iso": "2026-03-21T23:30:00Z"},
    {"slug": "nba-okc-phi-2026-03-23", "start_iso": "2026-03-23T23:00:00Z"},
    {"slug": "nba-chi-phi-2026-03-25", "start_iso": "2026-03-25T23:00:00Z"},
    {"slug": "nba-phi-cha-2026-03-28", "start_iso": "2026-03-28T22:00:00Z"},
    {"slug": "nba-phi-mia-2026-03-30", "start_iso": "2026-03-31T00:00:00Z"},
    {"slug": "nba-phi-was-2026-04-01", "start_iso": "2026-04-01T23:00:00Z"},
    {"slug": "nba-min-phi-2026-04-03", "start_iso": "2026-04-03T23:00:00Z"},
    {"slug": "nba-det-phi-2026-04-04", "start_iso": "2026-04-04T23:00:00Z"},
    {"slug": "nba-phi-sas-2026-04-06", "start_iso": "2026-04-06T23:00:00Z"},
    {"slug": "nba-phi-hou-2026-04-09", "start_iso": "2026-04-09T23:00:00Z"},
    {"slug": "nba-phi-ind-2026-04-10", "start_iso": "2026-04-10T23:30:00Z"},
    {"slug": "nba-mil-phi-2026-04-12", "start_iso": "2026-04-12T22:00:00Z"},
]
