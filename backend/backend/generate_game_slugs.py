#!/usr/bin/env python3
"""
Generate Polymarket slugs and start times for all games from gamedata.csv
"""
import csv
from datetime import datetime
import os

# Team name to abbreviation mapping
TEAM_ABBREV = {
    "Atlanta Hawks": "atl",
    "Boston Celtics": "bos",
    "Brooklyn Nets": "bkn",
    "Charlotte Hornets": "cha",
    "Chicago Bulls": "chi",
    "Cleveland Cavaliers": "cle",
    "Dallas Mavericks": "dal",
    "Denver Nuggets": "den",
    "Detroit Pistons": "det",
    "Golden State Warriors": "gsw",
    "Houston Rockets": "hou",
    "Indiana Pacers": "ind",
    "Los Angeles Clippers": "lac",
    "Los Angeles Lakers": "lal",
    "Memphis Grizzlies": "mem",
    "Miami Heat": "mia",
    "Milwaukee Bucks": "mil",
    "Minnesota Timberwolves": "min",
    "New Orleans Pelicans": "nop",
    "New York Knicks": "nyk",
    "Oklahoma City Thunder": "okc",
    "Orlando Magic": "orl",
    "Philadelphia 76ers": "phi",
    "Phoenix Suns": "phx",
    "Portland Trail Blazers": "por",
    "Sacramento Kings": "sac",
    "San Antonio Spurs": "sas",
    "Toronto Raptors": "tor",
    "Utah Jazz": "uta",
    "Washington Wizards": "was",
}


def parse_date(date_str):
    """Parse date string like 'Tue Oct 21 2025' to '2025-10-21'"""
    # Remove day of week
    parts = date_str.split()
    month_day_year = " ".join(parts[1:])
    dt = datetime.strptime(month_day_year, "%b %d %Y")
    return dt.strftime("%Y-%m-%d")


def parse_time(time_str, date_str):
    """Parse time string like '7:30p' and combine with date to get ISO format"""
    # Parse the time
    time_str = time_str.strip()
    if time_str.endswith('p'):
        # PM time
        time_part = time_str[:-1]
        hour, minute = time_part.split(':')
        hour = int(hour)
        if hour != 12:
            hour += 12
    else:
        # AM time
        time_part = time_str[:-1]
        hour, minute = time_part.split(':')
        hour = int(hour)
        if hour == 12:
            hour = 0
    
    # Combine with date
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    # ET is UTC-5 (or UTC-4 during DST), for simplicity using UTC-5
    # Add 5 hours to convert ET to UTC
    dt = date_obj.replace(hour=hour, minute=int(minute))
    # Add 5 hours for ET to UTC conversion
    from datetime import timedelta
    dt_utc = dt + timedelta(hours=5)
    
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")


def generate_slug(visitor_team, home_team, date):
    """Generate slug in format: nba-visitor-home-YYYY-MM-DD"""
    visitor_abbrev = TEAM_ABBREV.get(visitor_team)
    home_abbrev = TEAM_ABBREV.get(home_team)
    
    if not visitor_abbrev or not home_abbrev:
        return None
    
    return f"nba-{visitor_abbrev}-{home_abbrev}-{date}"


def main():
    input_file = os.path.join(os.path.dirname(__file__), "gamedata.csv")
    output_file = os.path.join(os.path.dirname(__file__), "game_slugs.csv")
    
    games = []
    
    with open(input_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            date_str = row['Date']
            time_str = row['Start (ET)']
            visitor = row['Visitor/Neutral']
            home = row['Home/Neutral']
            
            # Skip empty rows or header rows
            if not date_str or not visitor or not home:
                continue
            
            try:
                date = parse_date(date_str)
                start_iso = parse_time(time_str, date)
                slug = generate_slug(visitor, home, date)
                
                if slug:
                    games.append({
                        'slug': slug,
                        'start_iso': start_iso,
                        'date': date,
                        'visitor': visitor,
                        'home': home
                    })
            except Exception as e:
                print(f"Error processing row: {date_str}, {visitor} @ {home}: {e}")
                continue
    
    # Write to output file
    with open(output_file, 'w', newline='') as f:
        fieldnames = ['slug', 'start_iso', 'date', 'visitor', 'home']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(games)
    
    print(f"Generated {len(games)} game slugs")
    print(f"Output written to: {output_file}")


if __name__ == "__main__":
    main()
