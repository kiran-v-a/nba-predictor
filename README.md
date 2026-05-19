# NBA Predictor

An elite, AI-powered NBA game outcome prediction platform featuring a stunning, agency-tier cinematic frontend and a robust FastAPI + XGBoost machine learning backend.

## Features

- **XGBoost Machine Learning Model:** Analyzes 3+ seasons of historical NBA game logs to predict game outcomes with high accuracy.
- **Advanced Feature Engineering:** Calculates live offensive ratings, defensive ratings, team pace, win percentages, and more.
- **Cinematic Frontend:** A $10,000-tier aesthetic featuring full-viewport parallax scenes, scroll-driven word reveals, horizontal scroll timelines, and beautiful glassmorphism UI.
- **Real-time NBA API Integration:** Pulls the latest live stats directly from the official NBA statistics endpoints.

## Detailed Implementation

For an in-depth, technical explanation of how the data pipeline, the XGBoost ML model, and the FastAPI architecture work together, please read the [**implementation.md**](./implementation.md) file included in this repository.

## Tech Stack

- **Backend:** Python, FastAPI, XGBoost, Pandas, `nba_api`, Scikit-Learn
- **Frontend:** HTML5, Vanilla JavaScript, CSS3 (No heavy frameworks, raw performance)
- **Design System:** Playfair Display (Serif), Outfit (Sans-serif), Custom CSS Variables, Glassmorphism 

## Local Setup & Installation

### 1. Set Up the Backend

```bash
# Navigate to the backend folder
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate # macOS/Linux

# Install all required data and ML dependencies
pip install -r requirements.txt
```

### 2. Run the Backend API

```bash
# Ensure you are still in the /backend folder
python -m uvicorn main:app --reload
```
*The API will start on `http://127.0.0.1:8000`.*
*(Note: The first time you start the server, it will take a few minutes to fetch the 3 seasons of NBA data and train the ML model. After that, the model is cached instantly!)*

### 3. Run the Frontend

Since the frontend uses modern JavaScript modules and Canvas API, it must be served over an HTTP server (not just by double-clicking the HTML file).

```bash
# Open a new terminal window
# Navigate to the frontend folder
cd frontend

# Start a simple HTTP server
python -m http.server 5500
```
*The UI will be available at `http://localhost:5500`.*

---

*Built for precision. Designed for aesthetics.*
