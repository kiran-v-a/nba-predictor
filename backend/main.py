"""
main.py — FastAPI Application (All Routes)
===========================================
Serves the NBA Predictor API with 3 endpoints:
  GET  /        → Health check
  POST /predict → Game outcome prediction
  GET  /teams   → List of all 30 NBA teams

Run with: uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data import get_all_teams
from model import predict_game, load_model

# ── Initialize FastAPI App ────────────────────────────────────────────────────
app = FastAPI(
    title="NBA Game Predictor API",
    description="AI-powered NBA game outcome predictions using XGBoost",
    version="1.0.0"
)

# ── Enable CORS (allow all origins so the frontend can call freely) ──────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Allow all origins (frontend can be on any port)
    allow_credentials=True,
    allow_methods=["*"],       # Allow all HTTP methods
    allow_headers=["*"],       # Allow all headers
)

# ── Preload the model on startup so the first request is fast ─────────────────
@app.on_event("startup")
async def startup_event():
    """Load (or train) the ML model when the server starts."""
    print("\n[STARTUP] NBA Predictor API starting up...")
    print("   Loading ML model...\n")
    load_model()
    print("\n[READY] API is ready to serve predictions!\n")


# ── Request Schema for /predict endpoint ─────────────────────────────────────
class PredictionRequest(BaseModel):
    """Schema: expects home_team and away_team as strings."""
    home_team: str
    away_team: str


# ══════════════════════════════════════════════════════════════════════════════
# ROUTE 1: Health Check
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/")
async def health_check():
    """
    Simple health check endpoint.
    Returns API status and version info.
    """
    return {
        "status": "online",
        "message": "NBA Game Predictor API is running",
        "version": "1.0.0"
    }


# ══════════════════════════════════════════════════════════════════════════════
# ROUTE 2: Predict Game Outcome
# ══════════════════════════════════════════════════════════════════════════════
@app.post("/predict")
async def predict(request: PredictionRequest):
    """
    Accepts a JSON body with home_team and away_team.
    Returns the predicted winner, confidence score, and home win probability.
    
    Example request:
        POST /predict
        { "home_team": "Los Angeles Lakers", "away_team": "Boston Celtics" }
    
    Example response:
        {
            "winner": "Los Angeles Lakers",
            "confidence": 0.73,
            "home_win_prob": 0.73,
            "home_team": "Los Angeles Lakers",
            "away_team": "Boston Celtics"
        }
    """
    try:
        # Validate that both teams are real NBA teams
        valid_teams = get_all_teams()
        
        if request.home_team not in valid_teams:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid home team: '{request.home_team}'. Use GET /teams for valid names."
            )
        if request.away_team not in valid_teams:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid away team: '{request.away_team}'. Use GET /teams for valid names."
            )
        if request.home_team == request.away_team:
            raise HTTPException(
                status_code=400,
                detail="Home team and away team cannot be the same."
            )

        # Run the prediction through the ML model
        result = predict_game(request.home_team, request.away_team)

        # Return prediction along with the input teams for context
        return {
            "winner": result["winner"],
            "confidence": result["confidence"],
            "home_win_prob": result["home_win_prob"],
            "home_team": request.home_team,
            "away_team": request.away_team,
            "stats": result["stats"],
            "feature_importances": result["feature_importances"]
        }

    except HTTPException:
        raise  # Re-raise validation errors as-is
    except Exception as e:
        # Catch unexpected errors (API timeouts, data issues, etc.)
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# ROUTE 3: List All NBA Teams
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/teams")
async def list_teams():
    """
    Returns a sorted list of all 30 NBA team full names.
    Used by the frontend to populate the team selection dropdowns.
    """
    return {
        "teams": get_all_teams(),
        "count": len(get_all_teams())
    }
