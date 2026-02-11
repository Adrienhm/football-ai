from pathlib import Path

from training import train_model

DATA_PATH = Path(__file__).parent / "data" / "matches.csv"
MODEL_PATH = Path(__file__).parent / "models" / "football_model.joblib"
METRICS_PATH = Path(__file__).parent / "models" / "metrics.json"


if __name__ == "__main__":
    metrics = train_model(DATA_PATH, MODEL_PATH, METRICS_PATH, algo="logistic")
    print("Model saved to", MODEL_PATH)
    print("Metrics saved to", METRICS_PATH)
    print(metrics)
