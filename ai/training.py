import json
from pathlib import Path
from typing import Dict, List

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    auc,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_recall_curve,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, label_binarize

BASE_FEATURES = [
    "strength_a",
    "strength_b",
    "form_a",
    "form_b",
    "xg_a",
    "xg_b",
    "injuries_a",
    "injuries_b",
    "shots_a",
    "shots_b",
    "poss_a",
    "poss_b",
]

DERIVED_FEATURES = [
    "strength_diff",
    "form_diff",
    "xg_diff",
    "injuries_diff",
    "shots_diff",
    "poss_diff",
]

FEATURES = BASE_FEATURES + DERIVED_FEATURES


def build_dataset(data_path: Path) -> pd.DataFrame:
    df = pd.read_csv(data_path)
    df["outcome"] = df.apply(
        lambda row: "home_win"
        if row["goals_a"] > row["goals_b"]
        else "away_win"
        if row["goals_a"] < row["goals_b"]
        else "draw",
        axis=1,
    )
    return df


def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["strength_diff"] = df["strength_a"] - df["strength_b"]
    df["form_diff"] = df["form_a"] - df["form_b"]
    df["xg_diff"] = df["xg_a"] - df["xg_b"]
    df["injuries_diff"] = df["injuries_a"] - df["injuries_b"]
    df["shots_diff"] = df["shots_a"] - df["shots_b"]
    df["poss_diff"] = df["poss_a"] - df["poss_b"]
    return df


def build_preprocessor(algo: str) -> ColumnTransformer:
    if algo == "logistic":
        return ColumnTransformer([("scale", StandardScaler(), FEATURES)], remainder="drop")
    return ColumnTransformer([("pass", "passthrough", FEATURES)], remainder="drop")


def build_model(algo: str):
    if algo == "rf":
        return RandomForestClassifier(
            n_estimators=220,
            random_state=42,
            class_weight="balanced",
        )
    return LogisticRegression(
        max_iter=300,
        multi_class="multinomial",
        solver="lbfgs",
        class_weight="balanced",
    )


def feature_importance_map(model, feature_names) -> Dict[str, float]:
    if hasattr(model, "coef_"):
        import numpy as np

        coefs = getattr(model, "coef_")
        importance = np.mean(np.abs(coefs), axis=0)
        return {name: float(val) for name, val in zip(feature_names, importance)}

    if hasattr(model, "feature_importances_"):
        importances = getattr(model, "feature_importances_")
        return {name: float(val) for name, val in zip(feature_names, importances)}

    return {}


def _downsample(values: List[float], max_points: int = 30) -> List[float]:
    if len(values) <= max_points:
        return [float(v) for v in values]
    step = max(1, len(values) // max_points)
    sampled = values[::step]
    if sampled[-1] != values[-1]:
        sampled.append(values[-1])
    return [float(v) for v in sampled]


def roc_data(y_true, y_prob, classes: List[str]) -> Dict[str, dict]:
    y_bin = label_binarize(y_true, classes=classes)
    roc_map: Dict[str, dict] = {}
    for idx, label in enumerate(classes):
        fpr, tpr, _ = roc_curve(y_bin[:, idx], y_prob[:, idx])
        roc_map[label] = {
            "fpr": _downsample(fpr.tolist()),
            "tpr": _downsample(tpr.tolist()),
            "auc": float(auc(fpr, tpr)),
        }
    return roc_map


def pr_data(y_true, y_prob, classes: List[str]) -> Dict[str, dict]:
    y_bin = label_binarize(y_true, classes=classes)
    pr_map: Dict[str, dict] = {}
    for idx, label in enumerate(classes):
        precision, recall, _ = precision_recall_curve(y_bin[:, idx], y_prob[:, idx])
        pr_map[label] = {
            "precision": _downsample(precision.tolist()),
            "recall": _downsample(recall.tolist()),
        }
    return pr_map


def train_model(
    data_path: Path,
    model_path: Path,
    metrics_path: Path,
    algo: str = "logistic",
) -> dict:
    df = build_dataset(data_path)
    df = add_derived_features(df)
    X = df[FEATURES]
    y = df["outcome"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    preprocessor = build_preprocessor(algo)
    model = build_model(algo)

    pipeline = Pipeline([
        ("prep", preprocessor),
        ("clf", model),
    ])

    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_test)
    probs = pipeline.predict_proba(X_test)
    classes = pipeline.classes_.tolist()

    metrics = {
        "accuracy": float(accuracy_score(y_test, preds)),
        "f1_weighted": float(f1_score(y_test, preds, average="weighted")),
        "log_loss": float(log_loss(y_test, probs, labels=pipeline.classes_)),
        "classes": classes,
        "rows": int(len(df)),
        "model": algo,
        "confusion_matrix": confusion_matrix(y_test, preds, labels=classes).tolist(),
        "roc": roc_data(y_test, probs, classes),
        "pr": pr_data(y_test, probs, classes),
    }

    feature_importance = feature_importance_map(pipeline.named_steps["clf"], FEATURES)
    metrics["feature_importance"] = feature_importance

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_path)
    metrics_path.write_text(json.dumps(metrics, indent=2))

    return metrics


def train_compare(
    data_path: Path,
    out_path: Path,
    logistic_path: Path,
    rf_path: Path,
) -> dict:
    metrics_logistic = train_model(data_path, logistic_path, out_path, algo="logistic")
    metrics_rf = train_model(data_path, rf_path, out_path, algo="rf")

    compare = {
        "logistic": metrics_logistic,
        "rf": metrics_rf,
    }
    out_path.write_text(json.dumps(compare, indent=2))
    return compare
