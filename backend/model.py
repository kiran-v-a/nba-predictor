"""
model.py — ML Model: Train + Predict Logic
============================================
Trains an XGBClassifier on NBA matchup data to predict home team win/loss.
Supports model caching with joblib to avoid retraining on every request.
"""

import os
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from data import build_training_data, get_matchup_features

# ── Path for the cached model file ───────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'nba_model.pkl')

# ── Feature columns used by the model (must match data.py output) ────────────
FEATURE_COLS = [
    'home_win_pct', 'home_home_win_pct', 'home_last5_win_pct',
    'home_avg_pts', 'home_avg_pts_allowed', 'home_pace',
    'home_off_rating', 'home_def_rating',
    'away_win_pct', 'away_away_win_pct', 'away_last5_win_pct',
    'away_avg_pts', 'away_avg_pts_allowed', 'away_pace',
    'away_off_rating', 'away_def_rating'
]


# ── Train the XGBoost Model ──────────────────────────────────────────────────
def train_model() -> XGBClassifier:
    """
    Trains an XGBClassifier on the full matchup dataset.
    Prints feature list, accuracy score, and saves the model to disk.
    Returns the trained model.
    """
    print("\n>> ======================================================")
    print("   NBA PREDICTOR - MODEL TRAINING")
    print("   ======================================================\n")

    # Step 1: Build training data from NBA API
    df = build_training_data()

    # Step 2: Separate features (X) and target (y)
    X = df[FEATURE_COLS]
    y = df['home_win']

    # Step 3: Print which features are being used
    print("\n[FEATURES] Features used for training:")
    for i, col in enumerate(FEATURE_COLS, 1):
        print(f"   {i:2d}. {col}")

    # Step 4: Train/test split for accuracy evaluation (80/20 split)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Step 5: Initialize and train the XGBClassifier
    # These hyperparameters are tuned for tabular sports data:
    #   - n_estimators=200: enough trees for good generalization
    #   - max_depth=5: prevents overfitting on noisy sports data
    #   - learning_rate=0.05: slow learning for better convergence
    model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        objective='binary:logistic',  # Binary classification (win/loss)
        eval_metric='logloss',
        use_label_encoder=False,
        random_state=42,
        verbosity=0  # Suppress XGBoost warnings
    )

    print(f"\n[TRAINING] Training XGBClassifier on {len(X_train)} samples...")
    model.fit(X_train, y_train)

    # Step 6: Evaluate accuracy on the test set
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"[OK] Model Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")
    print(f"   Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    # Step 7: Save model to disk with joblib for fast loading later
    joblib.dump(model, MODEL_PATH)
    print(f"[SAVED] Model saved to: {MODEL_PATH}")

    return model


# ── Load or Train the Model ──────────────────────────────────────────────────
def load_model() -> XGBClassifier:
    """
    Loads the model from cache if available, otherwise trains a new one.
    Prints whether the model was loaded from cache or freshly trained.
    """
    if os.path.exists(MODEL_PATH):
        # Model cache exists — load it directly (much faster than retraining)
        print("\n[CACHE] Loading model from cache...")
        model = joblib.load(MODEL_PATH)
        print(f"[OK] Model loaded from cache: {MODEL_PATH}")
        print(f"   (Delete '{MODEL_PATH}' to force retraining)")
        return model
    else:
        # No cache found — train from scratch
        print("\n[TRAIN] No cached model found. Training a new model...")
        return train_model()


# ── Predict Game Outcome ─────────────────────────────────────────────────────
def predict_game(home_team: str, away_team: str) -> dict:
    """
    Predicts the outcome of a game between home_team and away_team.
    
    Args:
        home_team: Full name of the home team (e.g., "Los Angeles Lakers")
        away_team: Full name of the away team (e.g., "Boston Celtics")
    
    Returns:
        {
            "winner": "Los Angeles Lakers",
            "confidence": 0.73,
            "home_win_prob": 0.73
        }
    """
    # Load the trained model (from cache or retrain)
    model = load_model()

    # Fetch live features for this specific matchup
    print(f"\n[FETCH] Fetching stats for: {home_team} (Home) vs {away_team} (Away)...")
    features = get_matchup_features(home_team, away_team)

    # Convert to DataFrame with correct column order for prediction
    X_pred = pd.DataFrame([features])[FEATURE_COLS]

    # Get probability predictions (returns [prob_class_0, prob_class_1])
    proba = model.predict_proba(X_pred)[0]
    home_win_prob = float(proba[1])  # Probability of home team winning

    # Determine the predicted winner and confidence level
    if home_win_prob >= 0.5:
        winner = home_team
        confidence = home_win_prob
    else:
        winner = away_team
        confidence = 1 - home_win_prob

    print(f"[WINNER] Prediction: {winner} wins with {confidence:.1%} confidence")

    # Extract feature importances from the trained model
    importances = model.feature_importances_
    feat_imp = []
    for col, imp in zip(FEATURE_COLS, importances):
        # Clean up feature name for display
        clean = col.replace('home_', '').replace('away_', '').replace('_', ' ').title()
        feat_imp.append({"name": clean, "importance": round(float(imp), 4)})
    feat_imp.sort(key=lambda x: x["importance"], reverse=True)

    return {
        "winner": winner,
        "confidence": round(confidence, 4),
        "home_win_prob": round(home_win_prob, 4),
        "stats": features,
        "feature_importances": feat_imp[:8]
    }


# ── CLI: Train or test the model directly ────────────────────────────────────
if __name__ == "__main__":
    # When run directly, train the model and do a test prediction
    print("Running model.py directly — training model...\n")
    train_model()
    
    # Quick test prediction
    print("\n" + "="*50)
    print("TEST PREDICTION")
    print("="*50)
    result = predict_game("Los Angeles Lakers", "Boston Celtics")
    print(f"\nResult: {result}")
