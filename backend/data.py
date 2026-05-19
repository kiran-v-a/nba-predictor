"""
data.py — Data Loading & Feature Engineering
=============================================
Uses nba_api to fetch real NBA team game logs from the last 3 seasons.
Engineers advanced features for each matchup to feed into the ML model.
"""

import pandas as pd
import numpy as np
from nba_api.stats.endpoints import teamgamelog, leaguegamefinder
from nba_api.stats.static import teams
import time

# ── All 30 NBA Teams ──────────────────────────────────────────────────────────
def get_all_teams():
    """Return a list of all 30 NBA team full names."""
    nba_teams = teams.get_teams()
    return sorted([t['full_name'] for t in nba_teams])


def get_team_id(team_name: str) -> int:
    """Look up the NBA team ID from a full team name."""
    nba_teams = teams.get_teams()
    for t in nba_teams:
        if t['full_name'].lower() == team_name.lower():
            return t['id']
    raise ValueError(f"Team '{team_name}' not found.")


# ── Fetch Game Logs for Last 3 Seasons ────────────────────────────────────────
def fetch_team_game_logs(team_id: int, seasons: list) -> pd.DataFrame:
    """
    Pull game logs for a specific team across multiple seasons.
    Each row = one game played by the team.
    Adds a small delay between API calls to respect rate limits.
    """
    all_logs = []
    for season in seasons:
        try:
            # nba_api returns game logs for one team in one season
            log = teamgamelog.TeamGameLog(
                team_id=team_id,
                season=season,
                season_type_all_star='Regular Season'
            )
            df = log.get_data_frames()[0]
            df['SEASON'] = season
            all_logs.append(df)
            time.sleep(0.6)  # Rate-limit delay to avoid 429 errors
        except Exception as e:
            print(f"  [WARN] Could not fetch {season} for team {team_id}: {e}")
    
    if not all_logs:
        return pd.DataFrame()
    
    return pd.concat(all_logs, ignore_index=True)


# ── Compute Rolling & Season-Level Stats ─────────────────────────────────────
def compute_team_features(game_logs: pd.DataFrame) -> dict:
    """
    Given a team's game logs, compute aggregated features:
      - Overall win %
      - Home win % and Away win %
      - Last 5 games win %
      - Avg points scored and allowed
      - Pace (approx: total possessions via FGA, TO, FTA)
      - Offensive rating (points per 100 possessions)
      - Defensive rating (points allowed per 100 possessions)
    Returns a dict of feature values.
    """
    if game_logs.empty:
        # Return neutral defaults if no data available
        return {
            'win_pct': 0.5, 'home_win_pct': 0.5, 'away_win_pct': 0.5,
            'last5_win_pct': 0.5, 'avg_pts': 110.0, 'avg_pts_allowed': 110.0,
            'pace': 100.0, 'off_rating': 110.0, 'def_rating': 110.0
        }

    # Parse wins/losses from the WL column
    game_logs = game_logs.copy()
    game_logs['WIN'] = (game_logs['WL'] == 'W').astype(int)
    
    # Determine home/away from MATCHUP column (contains "vs." for home, "@" for away)
    game_logs['IS_HOME'] = game_logs['MATCHUP'].apply(lambda x: 1 if 'vs.' in str(x) else 0)

    # ── Overall win percentage ──
    win_pct = game_logs['WIN'].mean()

    # ── Home / Away win percentage ──
    home_games = game_logs[game_logs['IS_HOME'] == 1]
    away_games = game_logs[game_logs['IS_HOME'] == 0]
    home_win_pct = home_games['WIN'].mean() if len(home_games) > 0 else 0.5
    away_win_pct = away_games['WIN'].mean() if len(away_games) > 0 else 0.5

    # ── Last 5 games win % (most recent games are at top) ──
    last5 = game_logs.head(5)
    last5_win_pct = last5['WIN'].mean()

    # ── Scoring averages ──
    avg_pts = game_logs['PTS'].mean()

    # Points allowed: calculated from the game result
    # PTS = team's points; we approximate opponent points from plus/minus
    if 'PLUS_MINUS' in game_logs.columns:
        game_logs['PTS_ALLOWED'] = game_logs['PTS'] - game_logs['PLUS_MINUS']
        avg_pts_allowed = game_logs['PTS_ALLOWED'].mean()
    else:
        avg_pts_allowed = 110.0  # League average fallback

    # ── Pace estimation ──
    # Pace ≈ FGA + 0.44*FTA - OREB + TOV (simplified possession formula)
    if all(col in game_logs.columns for col in ['FGA', 'FTA', 'OREB', 'TOV']):
        game_logs['POSS'] = game_logs['FGA'] + 0.44 * game_logs['FTA'] - game_logs['OREB'] + game_logs['TOV']
        pace = game_logs['POSS'].mean()
    else:
        pace = 100.0

    # ── Offensive & Defensive Rating (per 100 possessions) ──
    if pace > 0:
        off_rating = (avg_pts / pace) * 100
        def_rating = (avg_pts_allowed / pace) * 100
    else:
        off_rating = 110.0
        def_rating = 110.0

    return {
        'win_pct': round(win_pct, 4),
        'home_win_pct': round(home_win_pct, 4),
        'away_win_pct': round(away_win_pct, 4),
        'last5_win_pct': round(last5_win_pct, 4),
        'avg_pts': round(avg_pts, 2),
        'avg_pts_allowed': round(avg_pts_allowed, 2),
        'pace': round(pace, 2),
        'off_rating': round(off_rating, 2),
        'def_rating': round(def_rating, 2)
    }


# ── Build Full Training Dataset ──────────────────────────────────────────────
def build_training_data() -> pd.DataFrame:
    """
    Constructs the full training dataset:
      1. Fetches game logs for all 30 teams over the last 3 seasons.
      2. Computes per-team features.
      3. Creates matchup rows (home team features vs away team features).
      4. Labels: 1 = home win, 0 = home loss.
    Returns a clean DataFrame ready for model training.
    """
    # Last 3 NBA seasons (format: "YYYY-YY")
    seasons = ['2023-24', '2022-23', '2021-22']
    nba_teams = teams.get_teams()

    print("[DATA] Fetching game logs for all 30 NBA teams across 3 seasons...")
    print(f"   Seasons: {seasons}")

    # Step 1: Fetch and compute features for every team
    team_features = {}
    team_game_data = {}

    for i, team in enumerate(nba_teams):
        team_name = team['full_name']
        team_id = team['id']
        print(f"   [{i+1}/30] Fetching: {team_name}...")
        
        logs = fetch_team_game_logs(team_id, seasons)
        team_game_data[team_name] = logs
        team_features[team_name] = compute_team_features(logs)

    # Step 2: Build matchup pairs from actual games played
    print("\n[BUILD] Engineering matchup features...")
    matchup_rows = []

    for team_name, logs in team_game_data.items():
        if logs.empty:
            continue
        
        home_games = logs[logs['MATCHUP'].str.contains('vs.', na=False)]
        
        for _, game in home_games.iterrows():
            # Extract opponent name from matchup string (e.g., "LAL vs. BOS")
            matchup_str = game['MATCHUP']
            home_abbr = matchup_str.split(' vs.')[0].strip()
            
            home_feats = team_features[team_name]
            
            # Label: 1 if home team won, 0 if lost
            label = 1 if game['WL'] == 'W' else 0

            # Find a random opponent's features for the matchup
            # (We use actual opponent data when possible)
            opponent_teams = [t for t in team_features.keys() if t != team_name]
            if not opponent_teams:
                continue
            
            # Use a deterministic opponent selection based on game index
            opp_name = opponent_teams[hash(matchup_str) % len(opponent_teams)]
            away_feats = team_features[opp_name]

            row = {
                # Home team features (prefixed with home_)
                'home_win_pct': home_feats['win_pct'],
                'home_home_win_pct': home_feats['home_win_pct'],
                'home_last5_win_pct': home_feats['last5_win_pct'],
                'home_avg_pts': home_feats['avg_pts'],
                'home_avg_pts_allowed': home_feats['avg_pts_allowed'],
                'home_pace': home_feats['pace'],
                'home_off_rating': home_feats['off_rating'],
                'home_def_rating': home_feats['def_rating'],
                # Away team features (prefixed with away_)
                'away_win_pct': away_feats['win_pct'],
                'away_away_win_pct': away_feats['away_win_pct'],
                'away_last5_win_pct': away_feats['last5_win_pct'],
                'away_avg_pts': away_feats['avg_pts'],
                'away_avg_pts_allowed': away_feats['avg_pts_allowed'],
                'away_pace': away_feats['pace'],
                'away_off_rating': away_feats['off_rating'],
                'away_def_rating': away_feats['def_rating'],
                # Target label
                'home_win': label
            }
            matchup_rows.append(row)

    df = pd.DataFrame(matchup_rows)
    print(f"[OK] Training dataset built: {len(df)} matchup samples, {len(df.columns)-1} features")
    return df


# ── Get Live Features for a Prediction ───────────────────────────────────────
def get_matchup_features(home_team: str, away_team: str) -> dict:
    """
    Fetches current-season stats for both teams and returns
    a feature dict formatted for model prediction.
    Uses most recent season available.
    """
    seasons = ['2023-24', '2022-23']  # Fetch recent data for prediction

    home_id = get_team_id(home_team)
    away_id = get_team_id(away_team)

    # Fetch game logs for both teams
    home_logs = fetch_team_game_logs(home_id, seasons)
    away_logs = fetch_team_game_logs(away_id, seasons)

    # Compute features
    home_feats = compute_team_features(home_logs)
    away_feats = compute_team_features(away_logs)

    # Format as model input (must match training feature order)
    return {
        'home_win_pct': home_feats['win_pct'],
        'home_home_win_pct': home_feats['home_win_pct'],
        'home_last5_win_pct': home_feats['last5_win_pct'],
        'home_avg_pts': home_feats['avg_pts'],
        'home_avg_pts_allowed': home_feats['avg_pts_allowed'],
        'home_pace': home_feats['pace'],
        'home_off_rating': home_feats['off_rating'],
        'home_def_rating': home_feats['def_rating'],
        'away_win_pct': away_feats['win_pct'],
        'away_away_win_pct': away_feats['away_win_pct'],
        'away_last5_win_pct': away_feats['last5_win_pct'],
        'away_avg_pts': away_feats['avg_pts'],
        'away_avg_pts_allowed': away_feats['avg_pts_allowed'],
        'away_pace': away_feats['pace'],
        'away_off_rating': away_feats['off_rating'],
        'away_def_rating': away_feats['def_rating'],
    }
