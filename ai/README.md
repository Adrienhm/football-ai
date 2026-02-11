# Football AI - Service ML

## Setup

1. Create venv and install deps:
   - python -m venv .venv
   - .venv\Scripts\activate
   - pip install -r requirements.txt

2. Train model:
   - python train.py

3. Run service:
   - uvicorn service:app --reload --port 8001

## Endpoints
- GET /health
- GET /metrics
- POST /predict
- POST /train (multipart CSV file)
- POST /ingest/statsbomb

## Payload example
{
  "strengthA": 78,
  "strengthB": 72,
  "formA": 0.7,
  "formB": 0.6,
  "xgA": 1.9,
  "xgB": 1.4,
  "injuriesA": 1,
  "injuriesB": 2,
  "shotsA": 15,
  "shotsB": 11,
  "possessionA": 55,
  "possessionB": 45
}

## StatsBomb Open Data
The ingestion uses StatsBomb Open Data (JSON) to build a dataset and retrain.
If you publish or share analysis, attribute StatsBomb as required by their terms.
