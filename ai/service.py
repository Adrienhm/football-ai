from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingest_statsbomb import ingest_statsbomb
from training import FEATURES, train_compare, train_model

BASE_DIR = Path(__file__).parent
DATA_PATH = BASE_DIR / "data" / "matches.csv"
MODEL_PATH = BASE_DIR / "models" / "football_model.joblib"
METRICS_PATH = BASE_DIR / "models" / "metrics.json"
COMPARE_PATH = BASE_DIR / "models" / "metrics_compare.json"
LOGISTIC_PATH = BASE_DIR / "models" / "football_model_logistic.joblib"
RF_PATH = BASE_DIR / "models" / "football_model_rf.joblib"
ACTIVE_PATH = BASE_DIR / "models" / "active_model.json"

app = FastAPI(title="Football AI Service", version="1.5.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
metrics_cache: Optional[dict] = None
compare_cache: Optional[dict] = None
active_model: str = "logistic"


def _write_active(name: str):
    ACTIVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    ACTIVE_PATH.write_text(json.dumps({"model": name}))


def load_active():
    global active_model
    if ACTIVE_PATH.exists():
        try:
            active_model = json.loads(ACTIVE_PATH.read_text()).get("model", "logistic")
        except json.JSONDecodeError:
            active_model = "logistic"
    else:
        active_model = "logistic"


def load_model():
    global model
    load_active()
    if active_model == "rf" and RF_PATH.exists():
        model = joblib.load(RF_PATH)
        return
    if active_model == "logistic" and LOGISTIC_PATH.exists():
        model = joblib.load(LOGISTIC_PATH)
        return
    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)


def load_metrics():
    global metrics_cache
    if COMPARE_PATH.exists():
        try:
            compare = json.loads(COMPARE_PATH.read_text())
            if active_model in compare:
                metrics_cache = compare[active_model]
                return
        except json.JSONDecodeError:
            pass
    if METRICS_PATH.exists():
        metrics_cache = json.loads(METRICS_PATH.read_text())
    else:
        metrics_cache = None


def load_compare():
    global compare_cache
    if COMPARE_PATH.exists():
        compare_cache = json.loads(COMPARE_PATH.read_text())
    else:
        compare_cache = None


load_active()
load_model()
load_metrics()
load_compare()


class PredictRequest(BaseModel):
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
    competitionId: Optional[int] = None
    seasonId: Optional[int] = None


class ModelSelectRequest(BaseModel):
    model: str


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "rows": metrics_cache.get("rows") if metrics_cache else None,
        "model": metrics_cache.get("model") if metrics_cache else None,
        "active": active_model,
    }


@app.get("/metrics")
async def metrics():
    return metrics_cache or {}


@app.get("/metrics/compare")
async def metrics_compare():
    return compare_cache or {}


@app.get("/model/active")
async def model_active():
    return {"active": active_model}


@app.post("/model/select")
async def model_select(payload: ModelSelectRequest):
    name = payload.model if payload.model in ["logistic", "rf"] else "logistic"
    _write_active(name)
    load_active()
    load_model()
    load_metrics()
    return {"status": "ok", "active": active_model}


@app.post("/predict")
async def predict(payload: PredictRequest):
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
        prediction = "home_win" if payload.strengthA >= payload.strengthB else "away_win"
        return {
            "prediction": prediction,
            "confidence": 0.55,
            "score": payload.strengthA - payload.strengthB,
            "probabilities": {
                "home_win": 0.55 if prediction == "home_win" else 0.2,
                "draw": 0.25,
                "away_win": 0.55 if prediction == "away_win" else 0.2,
            },
            "model": "fallback",
        }

    df = pd.DataFrame([features], columns=FEATURES)
    probs = model.predict_proba(df)[0]
    classes = list(model.classes_)
    prob_map = dict(zip(classes, [float(p) for p in probs]))

    prediction = max(prob_map, key=prob_map.get)
    confidence = prob_map[prediction]
    score = prob_map.get("home_win", 0) - prob_map.get("away_win", 0)

    return {
        "prediction": prediction,
        "confidence": confidence,
        "score": score,
        "probabilities": prob_map,
        "model": active_model,
        "match_id": payload.matchId,
    }


@app.post("/train")
async def train(file: UploadFile = File(...), algo: str = Form("logistic")):
    content = await file.read()
    DATA_PATH.write_bytes(content)
    new_metrics = train_model(DATA_PATH, MODEL_PATH, METRICS_PATH, algo=algo)
    _write_active(algo)
    load_active()
    load_model()
    load_metrics()
    return {
        "status": "trained",
        "metrics": new_metrics,
    }


@app.post("/train/refresh")
async def train_refresh(algo: str = Form("logistic")):
    if not DATA_PATH.exists():
        return {"status": "error", "message": "Dataset not found"}
    new_metrics = train_model(DATA_PATH, MODEL_PATH, METRICS_PATH, algo=algo)
    _write_active(algo)
    load_active()
    load_model()
    load_metrics()
    return {
        "status": "trained",
        "metrics": new_metrics,
    }


@app.post("/train/compare")
async def train_compare_endpoint():
    if not DATA_PATH.exists():
        return {"status": "error", "message": "Dataset not found"}
    compare = train_compare(DATA_PATH, COMPARE_PATH, LOGISTIC_PATH, RF_PATH)
    load_compare()
    return {"status": "trained", "compare": compare}


@app.post("/ingest/statsbomb")
async def ingest_statsbomb_endpoint(payload: IngestRequest):
    path, comp, season, count = ingest_statsbomb(
        DATA_PATH,
        competition_id=payload.competitionId,
        season_id=payload.seasonId,
    )
    new_metrics = train_model(path, MODEL_PATH, METRICS_PATH, algo="logistic")
    train_compare(path, COMPARE_PATH, LOGISTIC_PATH, RF_PATH)
    _write_active("logistic")
    load_active()
    load_model()
    load_metrics()
    load_compare()
    return {
        "status": "ingested",
        "competition_id": comp,
        "season_id": season,
        "rows": count,
        "metrics": new_metrics,
    }
