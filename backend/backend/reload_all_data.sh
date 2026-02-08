#!/bin/bash
# Script to reload all game data and regenerate analysis
# Run this after modifying games in game_slugs.csv

set -e  # Exit on error

echo "=========================================="
echo "Reloading All Game Data"
echo "=========================================="

# Remove old database
echo "Clearing existing database..."
rm -f price_history.db

# Initialize database
echo "Initializing database..."
python3 -c "from database import init_database; init_database(); print('Database initialized')"

echo ""
echo "=========================================="
echo "Extracting Price History for All Games"
echo "=========================================="

# Extract all games at once (processes each unique game slug once)
echo "Extracting price history..."
python3 main.py

echo ""
echo "=========================================="
echo "Loading Data into Database"
echo "=========================================="

# Load all game data into database
echo "Loading game data into database..."
python3 database.py

echo ""
echo "=========================================="
echo "All games processed successfully!"
echo "=========================================="
