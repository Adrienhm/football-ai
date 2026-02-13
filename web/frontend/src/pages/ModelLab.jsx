import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const algoOptions = [
  { value: "logistic", label: "Logistic Regression" },
  { value: "rf", label: "Random Forest" },
];

const buildPolyline = (points = [], width = 240, height = 120) => {
  if (!points.length) return "";
  return points
    .map((p) => `${p.x * width},${height - p.y * height}`)
    .join(" ");
};

const mapRoc = (roc) =>
  (roc?.fpr || []).map((fpr, idx) => ({
    x: fpr,
    y: roc.tpr?.[idx] ?? 0,
  }));

const mapPr = (pr) =>
  (pr?.recall || []).map((recall, idx) => ({
    x: recall,
    y: pr.precision?.[idx] ?? 0,
  }));

const ConfusionTable = ({ matrix = [], labels = [] }) => {
  if (!matrix.length) return <p className="hint">Aucune matrice disponible.</p>;
  return (
    <div className="matrix">
      <div className="matrix-head">
        <span></span>
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {matrix.map((row, idx) => (
        <div className="matrix-row" key={`row-${idx}`}>
          <span className="matrix-label">{labels[idx]}</span>
          {row.map((cell, cellIdx) => (
            <span className="matrix-cell" key={`cell-${idx}-${cellIdx}`}>
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

const CurveCard = ({ title, subtitle, polyline, footer }) => (
  <div className="curve-card">
    <h4>{title}</h4>
    <p className="hint">{subtitle}</p>
    <svg viewBox="0 0 240 120" role="img">
      <polyline fill="none" stroke="#49e26f" strokeWidth="3" points={polyline} />
      <line x1="0" y1="120" x2="240" y2="0" stroke="#2b3c37" strokeDasharray="4 4" />
    </svg>
    <p className="hint">{footer}</p>
  </div>
);

function ModelLab() {
  const [metrics, setMetrics] = useState(null);
  const [compare, setCompare] = useState(null);
  const [algo, setAlgo] = useState("logistic");
  const [activeModel, setActiveModel] = useState("logistic");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [singleRes, compareRes, activeRes] = await Promise.all([
        api.get("/ai/metrics"),
        api.get("/ai/metrics/compare"),
        api.get("/ai/model/active"),
      ]);
      setMetrics(singleRes.data);
      setCompare(compareRes.data);
      setActiveModel(activeRes.data?.active || "logistic");

      const hasCompare =
        compareRes.data?.logistic?.accuracy !== undefined ||
        compareRes.data?.rf?.accuracy !== undefined;
      if (!hasCompare) {
        await api.post("/ai/train/compare");
        const refreshed = await api.get("/ai/metrics/compare");
        setCompare(refreshed.data);
      }
    } catch (err) {
      setMetrics(null);
      setCompare(null);
      setMessage(
        err?.response?.data?.error ||
          "Impossible de charger les métriques. Vérifie le service IA."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const triggerTraining = async () => {
    setLoading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("algo", algo);
      await api.post("/ai/train/refresh", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Entrainement relancé avec le dataset actuel.");
      await api.post("/ai/train/compare");
      loadMetrics();
    } catch (err) {
      const details = err?.response?.data?.details || err?.response?.data?.error;
      setMessage(
        details
          ? `Impossible de relancer l'entrainement: ${details}`
          : "Impossible de relancer l'entrainement. Vérifie le service IA."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectActive = async (value) => {
    setLoading(true);
    setMessage("");
    try {
      await api.post("/ai/model/select", { model: value });
      setActiveModel(value);
      setMessage(`Modèle actif: ${value}.`);
      loadMetrics();
    } catch (err) {
      const details = err?.response?.data?.details || err?.response?.data?.error;
      setMessage(
        details
          ? `Impossible de changer le modèle actif: ${details}`
          : "Impossible de changer le modèle actif. Vérifie le service IA."
      );
    } finally {
      setLoading(false);
    }
  };

  const importance = metrics?.feature_importance || {};
  const importanceEntries = Object.entries(importance).sort((a, b) => b[1] - a[1]);

  const compareEntries = useMemo(() => {
    if (!compare) return [];
    return [
      { key: "logistic", label: "Logistic Regression", data: compare.logistic },
      { key: "rf", label: "Random Forest", data: compare.rf },
    ];
  }, [compare]);

  const rocByClass = useMemo(() => {
    if (!compare) return [];
    return compareEntries.map((entry) => ({
      key: entry.key,
      label: entry.label,
      roc: entry.data?.roc || {},
      pr: entry.data?.pr || {},
    }));
  }, [compare, compareEntries]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Laboratoire IA</p>
          <h1>Comparer et ajuster le modèle</h1>
          <p className="lead">Teste plusieurs algorithmes et observe les features clé.</p>
        </div>
        <div className="model-actions">
          <select value={algo} onChange={(e) => setAlgo(e.target.value)}>
            {algoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="button primary" onClick={triggerTraining} disabled={loading}>
            {loading ? "Entrainement..." : "Relancer l'entrainement"}
          </button>
        </div>
      </div>

      {message ? <p className="hint">{message}</p> : null}

      <section className="grid-two">
        <div className="panel">
          <div className="section-head">
            <h2>Métriques du modèle actif</h2>
            <p>Dernier entrainement effectué.</p>
          </div>
          <div className="score-grid">
            <div>
              <span>Modèle</span>
              <strong>{metrics?.model || "-"}</strong>
            </div>
            <div>
              <span>Accuracy</span>
              <strong>{metrics?.accuracy?.toFixed?.(2) ?? "-"}</strong>
            </div>
            <div>
              <span>F1 weighted</span>
              <strong>{metrics?.f1_weighted?.toFixed?.(2) ?? "-"}</strong>
            </div>
            <div>
              <span>Log loss</span>
              <strong>{metrics?.log_loss?.toFixed?.(2) ?? "-"}</strong>
            </div>
          </div>
          <div className="active-model">
            <p>Modèle actif</p>
            <div className="active-buttons">
              {algoOptions.map((option) => (
                <button
                  key={option.value}
                  className={`button ${activeModel === option.value ? "primary" : "ghost"}`}
                  onClick={() => selectActive(option.value)}
                  disabled={loading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Variables les plus influentes</h2>
            <p>Importance moyenne par variable.</p>
          </div>
          <div className="importance">
            {importanceEntries.length === 0 ? (
              <p className="hint">Aucune importance disponible.</p>
            ) : (
              importanceEntries.map(([feature, value]) => (
                <div className="importance-row" key={feature}>
                  <span>{feature}</span>
                  <div className="importance-bar">
                    <div style={{ width: `${Math.round(value * 100)}%` }} />
                  </div>
                  <strong>{value.toFixed(3)}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Comparatif Régression logistique vs Forêt aléatoire</h2>
          <p>Métriques cote a cote sur le meme dataset.</p>
        </div>
        <div className="compare-grid">
          {compareEntries.map((entry) => (
            <div className="compare-card" key={entry.key}>
              <h3>{entry.label}</h3>
              <div className="score-grid">
                <div>
                  <span>Accuracy</span>
                  <strong>{entry.data?.accuracy?.toFixed?.(2) ?? "-"}</strong>
                </div>
                <div>
                  <span>F1 weighted</span>
                  <strong>{entry.data?.f1_weighted?.toFixed?.(2) ?? "-"}</strong>
                </div>
                <div>
                  <span>Log loss</span>
                  <strong>{entry.data?.log_loss?.toFixed?.(2) ?? "-"}</strong>
                </div>
              </div>
              <p className="hint">Classes: {entry.data?.classes?.join(", ") || "-"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>ROC par classe</h2>
          <p>Courbes ROC pour chaque outcome.</p>
        </div>
        {rocByClass.map((modelEntry) => (
          <div key={modelEntry.key} className="curve-section">
            <h3>{modelEntry.label}</h3>
            <div className="curve-grid">
              {Object.entries(modelEntry.roc || {}).map(([label, roc]) => (
                <CurveCard
                  key={`${modelEntry.key}-${label}`}
                  title={label}
                  subtitle="ROC"
                  polyline={buildPolyline(mapRoc(roc))}
                  footer={`AUC: ${roc.auc?.toFixed?.(2) ?? "-"}`}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Précision-Rappel par classe</h2>
          <p>Courbes PR pour chaque outcome.</p>
        </div>
        {rocByClass.map((modelEntry) => (
          <div key={modelEntry.key} className="curve-section">
            <h3>{modelEntry.label}</h3>
            <div className="curve-grid">
              {Object.entries(modelEntry.pr || {}).map(([label, pr]) => (
                <CurveCard
                  key={`${modelEntry.key}-${label}`}
                  title={label}
                  subtitle="PR"
                  polyline={buildPolyline(mapPr(pr))}
                  footer={`Points: ${pr.precision?.length || 0}`}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid-two">
        <div className="panel">
          <div className="section-head">
            <h2>Matrice de confusion</h2>
            <p>Modèle actif (dernier entrainement).</p>
          </div>
          <ConfusionTable matrix={metrics?.confusion_matrix} labels={metrics?.classes || []} />
        </div>
        <div className="panel">
          <div className="section-head">
            <h2>Etat modèle</h2>
            <p>Modele actif: {activeModel}</p>
          </div>
          <p className="hint">
            Change le modèle actif pour basculer la prédiction en temps réel.
          </p>
        </div>
      </section>
    </div>
  );
}

export default ModelLab;
