# NBA Predictor Backend Implementation

This document details the backend architecture, the machine learning model, and the data pipeline used to power the NBA Predictor.

## 1. System Architecture

The backend is built with **FastAPI** to serve high-performance async endpoints, using **XGBoost** for machine learning inference, and the official **NBA API** for live statistical data.

The architecture is split into three core modules:
1. `data.py` — Data fetching and feature engineering pipeline.
2. `model.py` — Machine learning model training, caching, and inference.
3. `main.py` — FastAPI application routing and HTTP interface.

---

## 2. Data Pipeline (`data.py`)

The ML model relies on historical and live data fetched directly from the NBA's official stats servers using the `nba_api` python package.

### How Data is Fetched
The system uses the `teamgamelog` endpoint to pull every single game played by all 30 NBA teams over the last three seasons. 

- **`get_all_teams()`**: Fetches the static list of all 30 current NBA franchises.
- **`fetch_team_game_logs(team_id, seasons)`**: Iterates through requested seasons (e.g., 2023-24, 2022-23) and downloads the raw box score logs for that specific team. A small `time.sleep(0.6)` is injected to respect the NBA API rate limits.

### Feature Engineering
Raw box scores are not enough for ML. The `compute_team_features()` function converts raw game logs into advanced analytical vectors:
1. **Win Rates**: Overall `win_pct`, specific `home_win_pct` / `away_win_pct`, and recent form `last5_win_pct`.
2. **Pace**: Estimated possessions per game using the simplified formula: `FGA + 0.44*FTA - OREB + TOV`.
3. **Advanced Ratings**: 
   - `off_rating`: Points scored per 100 possessions.
   - `def_rating`: Points allowed per 100 possessions.

When building the training dataset (`build_training_data()`), the system pairs a home team's features against an away team's features for past games, labeling the row with `1` if the home team won, and `0` if they lost.

---

## 3. Machine Learning Model (`model.py`)

The prediction engine is powered by **XGBoost** (`XGBClassifier`), a gradient-boosted decision tree algorithm highly effective for tabular sports data.

### Model Training
- **Algorithm**: `XGBClassifier` with `objective='binary:logistic'` to predict a binary win/loss outcome.
- **Hyperparameters**: 
  - `n_estimators=200`: Enough trees to capture complexity without massive overhead.
  - `max_depth=5`: Kept relatively shallow to prevent overfitting on highly variant sports data.
  - `learning_rate=0.05`: Slow learning step to ensure stable convergence.
- **Training Process**: The dataset of 4,800+ historical matchups is split 80/20 into train/test sets to evaluate accuracy. 

### Caching and Inference
To ensure lightning-fast API responses, the model is **not trained on every request**. 
- **`joblib`**: After the initial training run, the model state is serialized and saved to disk as `nba_model.pkl`.
- **`load_model()`**: Checks if `nba_model.pkl` exists. If it does, it loads it into memory instantly. If not, it triggers the multi-minute training pipeline.
- **`predict_game(home, away)`**: When a prediction is requested, the system fetches the *live* current-season features for both teams, feeds them into the cached model via `predict_proba()`, and returns the exact confidence interval of a home win.

---

## 4. API Interface (`main.py`)

The FastAPI application binds the data and ML models to HTTP endpoints for the frontend.

### Endpoints
* **`GET /`**
  * Health check endpoint to verify the server is running.
* **`GET /teams`**
  * Returns a sorted JSON array of all 30 valid NBA team names used to populate the frontend selection dropdowns.
* **`POST /predict`**
  * Accepts a JSON payload: `{"home_team": "...", "away_team": "..."}`.
  * Validates the teams against the known NBA dictionary.
  * Invokes `predict_game()`.
  * Returns a rich JSON response containing the predicted winner, the exact confidence percentage, the raw statistical features used, and the "feature importances" (which stats were most decisive in the model's decision).

### Startup Optimization
The API utilizes the `@app.on_event("startup")` hook to preload the ML model into memory the moment the Uvicorn server starts. This guarantees that the very first user who clicks "Predict" doesn't have to wait for the model to load from disk.
