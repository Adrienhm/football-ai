from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Dict, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingest_statsbomb import ingest_statsbomb
from training import FEATURES, train_compare, train_model

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
LEGACY_DATA_PATH = DATA_DIR / "matches.csv"

SPORTS = ("football", "basketball", "tennis", "rugby", "handball")

SPORT_TEAMS = {
    "football": ["Paris FC", "Lyon", "Marseille", "Lille", "Monaco", "Rennes"],
    "basketball": ["Lakers", "Warriors", "Raptors", "Celtics", "Bulls", "Spurs"],
    "tennis": ["ATP Team A", "ATP Team B", "WTA Team A", "WTA Team B"],
    "rugby": ["Toulouse", "Leinster", "Sharks", "Harlequins", "Leinster B", "Racing 92"],
    "handball": ["Barcelona", "PSG", "Kiel", "Veszprem", "Aalborg", "Nantes HB"],
}

SPORT_BASELINES = {
    "football": {"mean_a": 1.45, "mean_b": 1.20, "max_score": 6, "poss_base": 50},
    "basketball": {"mean_a": 101.0, "mean_b": 97.0, "max_score": 140, "poss_base": 50},
    "tennis": {"mean_a": 2.0, "mean_b": 1.8, "max_score": 3, "poss_base": 50},
    "rugby": {"mean_a": 24.0, "mean_b": 20.0, "max_score": 55, "poss_base": 50},
    "handball": {"mean_a": 31.0, "mean_b": 28.0, "max_score": 45, "poss_base": 50},
}


def normalize_sport(sport: Optional[str]) -> str:
    if not sport:
        return "football"
    value = sport.strip().lower()
    if value not in SPORTS:
        raise HTTPException(status_code=400, detail={"error": "Invalid sport", "sports": list(SPORTS)})
    return value


def sport_paths(sport: str) -> Dict[str, Path]:
    return {
        "data": DATA_DIR / f"{sport}_matches.csv",
        "model": MODELS_DIR / f"{sport}_model.joblib",
        "logistic": MODELS_DIR / f"{sport}_model_logistic.joblib",
        "rf": MODELS_DIR / f"{sport}_model_rf.joblib",
        "metrics": MODELS_DIR / f"{sport}_metrics.json",
        "compare": MODELS_DIR / f"{sport}_metrics_compare.json",
        "active": MODELS_DIR / f"{sport}_active_model.json",
    }


def generate_dataset(sport: str, rows: int = 240) -> pd.DataFrame:
    seed = 100 + sum(ord(char) for char in sport)
    rng = random.Random(seed)
    teams = SPORT_TEAMS[sport]
    base = SPORT_BASELINES[sport]

    data = []
    for i in range(rows):
        team_a = teams[rng.randint(0, len(teams) - 1)]
        team_b = teams[rng.randint(0, len(teams) - 1)]
        while team_b == team_a:
            team_b = teams[rng.randint(0, len(teams) - 1)]

        strength_a = rng.randint(55, 92)
        strength_b = rng.randint(55, 92)
        form_a = round(rng.uniform(0.35, 0.95), 3)
        form_b = round(rng.uniform(0.35, 0.95), 3)
        injuries_a = rng.randint(0, 4)
        injuries_b = rng.randint(0, 4)

        quality_a = (strength_a / 100) + form_a - injuries_a * 0.06
        quality_b = (strength_b / 100) + form_b - injuries_b * 0.06
        delta = quality_a - quality_b

        score_a = max(0, round(base["mean_a"] + delta * base["mean_a"] * 0.6 + rng.uniform(-1.2, 1.2)))
        score_b = max(0, round(base["mean_b"] - delta * base["mean_b"] * 0.6 + rng.uniform(-1.2, 1.2)))
        score_a = min(score_a, base["max_score"])
        score_b = min(score_b, base["max_score"])

        shots_a = max(1, int((score_a + 1) * rng.uniform(2.5, 7.5)))
        shots_b = max(1, int((score_b + 1) * rng.uniform(2.5, 7.5)))
        xg_a = round(min(base["max_score"], score_a * rng.uniform(0.75, 1.2) + rng.uniform(0.1, 0.9)), 2)
        xg_b = round(min(base["max_score"], score_b * rng.uniform(0.75, 1.2) + rng.uniform(0.1, 0.9)), 2)
        poss_a = round(base["poss_base"] + delta * 10 + rng.uniform(-5, 5), 2)
        poss_a = max(25.0, min(75.0, poss_a))
        poss_b = round(100.0 - poss_a, 2)

        data.append(
            {
                "date": f"2025-{((i % 12) + 1):02d}-{((i % 28) + 1):02d}",
                "team_a": team_a,
                "team_b": team_b,
                "goals_a": score_a,
                "goals_b": score_b,
                "strength_a": strength_a,
                "strength_b": strength_b,
                "form_a": form_a,
                "form_b": form_b,
                "xg_a": xg_a,
                "xg_b": xg_b,
                "injuries_a": injuries_a,
                "injuries_b": injuries_b,
                "shots_a": shots_a,
                "shots_b": shots_b,
                "poss_a": poss_a,
                "poss_b": poss_b,
            }
        )

    return pd.DataFrame(data)


def ensure_data_for_sport(sport: str) -> Path:
    paths = sport_paths(sport)
    paths["data"].parent.mkdir(parents=True, exist_ok=True)

    if paths["data"].exists():
        return paths["data"]

    if sport == "football" and LEGACY_DATA_PATH.exists():
        paths["data"].write_bytes(LEGACY_DATA_PATH.read_bytes())
        return paths["data"]

    generated = generate_dataset(sport, rows=260 if sport == "football" else 220)
    generated.to_csv(paths["data"], index=False)
    return paths["data"]


def read_json(path: Path) -> Optional[dict]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


state = {
    sport: {
        "active_model": "logistic",
        "model": None,
        "metrics_cache": None,
        "compare_cache": None,
    }
    for sport in SPORTS
}


def load_active(sport: str):
    paths = sport_paths(sport)
    active = read_json(paths["active"])
    state[sport]["active_model"] = active.get("model", "logistic") if active else "logistic"


def write_active(sport: str, name: str):
    write_json(sport_paths(sport)["active"], {"model": name})
    state[sport]["active_model"] = name


def load_model(sport: str):
    paths = sport_paths(sport)
    active = state[sport]["active_model"]
    model_path = paths["logistic"] if active == "logistic" else paths["rf"]
    if not model_path.exists():
        model_path = paths["model"]

    state[sport]["model"] = joblib.load(model_path) if model_path.exists() else None


def load_metrics(sport: str):
    paths = sport_paths(sport)
    compare = read_json(paths["compare"])
    active = state[sport]["active_model"]
    if compare and active in compare:
        state[sport]["metrics_cache"] = compare[active]
        return
    state[sport]["metrics_cache"] = read_json(paths["metrics"])


def load_compare(sport: str):
    state[sport]["compare_cache"] = read_json(sport_paths(sport)["compare"])


def boot_sport(sport: str):
    ensure_data_for_sport(sport)
    load_active(sport)
    load_model(sport)
    load_metrics(sport)
    load_compare(sport)


for _sport in SPORTS:
    boot_sport(_sport)


app = FastAPI(title="Sport AI Service", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    sport: str = "football"
    strengthA: float = 75
    strengthB: float = 70
    formA: float = 0.65
    formB: float = 0.62
    xgA: float = 1.7
    xgB: float = 1.5
    injuriesA: int = 1
    injuriesB: int = 1
    shotsA: int = 14
    shotsB: int = 12
    possessionA: float = 52
    possessionB: float = 48
    matchId: Optional[str] = None


class IngestRequest(BaseModel):
    sport: str = "football"
    competitionId: Optional[int] = None
    seasonId: Optional[int] = None


class ModelSelectRequest(BaseModel):
    sport: str = "football"
    model: str


def fallback_prediction(payload: PredictRequest, sport: str) -> dict:
    base = SPORT_BASELINES[sport]
    prediction = "home_win" if payload.strengthA >= payload.strengthB else "away_win"
    home = 0.58 if prediction == "home_win" else 0.21
    away = 0.58 if prediction == "away_win" else 0.21
    draw = max(0.08, 1.0 - home - away)
    return {
        "prediction": prediction,
        "confidence": max(home, away),
        "score": payload.strengthA - payload.strengthB,
        "probabilities": {"home_win": home, "draw": draw, "away_win": away},
        "model": f"fallback-{sport}",
        "sport": sport,
        "expected_points": round(base["mean_a"] + base["mean_b"], 2),
    }


@app.get("/sports")
async def sports():
    return {"sports": list(SPORTS)}


@app.get("/health")
async def health(sport: str = Query("football")):
    current = normalize_sport(sport)
    cache = state[current]["metrics_cache"]
    return {
        "status": "ok",
        "sport": current,
        "sports": list(SPORTS),
        "model_loaded": state[current]["model"] is not None,
        "rows": cache.get("rows") if cache else None,
        "model": cache.get("model") if cache else None,
        "active": state[current]["active_model"],
    }


@app.get("/metrics")
async def metrics(sport: str = Query("football")):
    current = normalize_sport(sport)
    return state[current]["metrics_cache"] or {}


@app.get("/metrics/compare")
async def metrics_compare(sport: str = Query("football")):
    current = normalize_sport(sport)
    return state[current]["compare_cache"] or {}


@app.get("/model/active")
async def model_active(sport: str = Query("football")):
    current = normalize_sport(sport)
    return {"sport": current, "active": state[current]["active_model"]}


@app.post("/model/select")
async def model_select(payload: ModelSelectRequest):
    current = normalize_sport(payload.sport)
    name = payload.model if payload.model in {"logistic", "rf"} else "logistic"
    write_active(current, name)
    load_model(current)
    load_metrics(current)
    return {"status": "ok", "sport": current, "active": state[current]["active_model"]}


@app.post("/predict")
async def predict(payload: PredictRequest):
    sport = normalize_sport(payload.sport)
    model = state[sport]["model"]
    features = {
        "strength_a": payload.strengthA,
        "strength_b": payload.strengthB,
        "form_a": payload.formA,
        "form_b": payload.formB,
        "xg_a": payload.xgA,
        "xg_b": payload.xgB,
        "injuries_a": payload.injuriesA,
        "injuries_b": payload.injuriesB,
        "shots_a": payload.shotsA,
        "shots_b": payload.shotsB,
        "poss_a": payload.possessionA,
        "poss_b": payload.possessionB,
        "strength_diff": payload.strengthA - payload.strengthB,
        "form_diff": payload.formA - payload.formB,
        "xg_diff": payload.xgA - payload.xgB,
        "injuries_diff": payload.injuriesA - payload.injuriesB,
        "shots_diff": payload.shotsA - payload.shotsB,
        "poss_diff": payload.possessionA - payload.possessionB,
    }

    if model is None:
        fallback = fallback_prediction(payload, sport)
        fallback["match_id"] = payload.matchId
        return fallback

    df = pd.DataFrame([features], columns=FEATURES)
    probs = model.predict_proba(df)[0]
    classes = list(model.classes_)
    prob_map = dict(zip(classes, [float(p) for p in probs]))
    prediction = max(prob_map, key=prob_map.get)
    confidence = prob_map[prediction]
    score = prob_map.get("home_win", 0.0) - prob_map.get("away_win", 0.0)

    return {
        "sport": sport,
        "prediction": prediction,
        "confidence": confidence,
        "score": score,
        "probabilities": prob_map,
        "model": state[sport]["active_model"],
        "match_id": payload.matchId,
    }


@app.post("/train")
async def train(
    file: UploadFile = File(...),
    algo: str = Form("logistic"),
    sport: str = Form("football"),
):
    current = normalize_sport(sport)
    paths = sport_paths(current)
    content = await file.read()
    paths["data"].write_bytes(content)
    metrics_data = train_model(paths["data"], paths["model"], paths["metrics"], algo=algo)
    write_active(current, algo if algo in {"logistic", "rf"} else "logistic")
    load_model(current)
    load_metrics(current)
    return {"status": "trained", "sport": current, "metrics": metrics_data}


@app.post("/train/refresh")
async def train_refresh(
    algo: str = Form("logistic"),
    sport: str = Form("football"),
):
    current = normalize_sport(sport)
    paths = sport_paths(current)
    if not paths["data"].exists():
        ensure_data_for_sport(current)
    metrics_data = train_model(paths["data"], paths["model"], paths["metrics"], algo=algo)
    write_active(current, algo if algo in {"logistic", "rf"} else "logistic")
    load_model(current)
    load_metrics(current)
    return {"status": "trained", "sport": current, "metrics": metrics_data}


@app.post("/train/compare")
async def train_compare_endpoint(sport: str = Form("football")):
    current = normalize_sport(sport)
    paths = sport_paths(current)
    if not paths["data"].exists():
        ensure_data_for_sport(current)
    compare = train_compare(paths["data"], paths["compare"], paths["logistic"], paths["rf"])
    load_compare(current)
    load_metrics(current)
    return {"status": "trained", "sport": current, "compare": compare}


@app.post("/ingest/statsbomb")
async def ingest_statsbomb_endpoint(payload: IngestRequest):
    current = normalize_sport(payload.sport)
    if current != "football":
        raise HTTPException(
            status_code=400,
            detail="StatsBomb Open Data is currently supported for football only.",
        )

    paths = sport_paths("football")
    path, comp, season, count = ingest_statsbomb(
        paths["data"],
        competition_id=payload.competitionId,
        season_id=payload.seasonId,
    )
    # Keep backward compatibility with previous tooling expecting ai/data/matches.csv
    LEGACY_DATA_PATH.write_bytes(path.read_bytes())

    metrics_data = train_model(path, paths["model"], paths["metrics"], algo="logistic")
    train_compare(path, paths["compare"], paths["logistic"], paths["rf"])
    write_active("football", "logistic")
    load_model("football")
    load_metrics("football")
    load_compare("football")

    return {
        "status": "ingested",
        "sport": "football",
        "competition_id": comp,
        "season_id": season,
        "rows": count,
        "metrics": metrics_data,
    }
