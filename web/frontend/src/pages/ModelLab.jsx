import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { toSportKey } from "../services/sports";

const algoOptions = [
  { value: "logistic", label: "Logistic Regression" },
  { value: "rf", label: "Random Forest" },
];

const buildPolyline = (points = [], width = 240, height = 120) => {
  if (!points.length) return "";
  return points.map((point) => `${point.x * width},${height - point.y * height}`).join(" ");
};

const mapRoc = (roc) =>
  (roc?.fpr || []).map((fpr, index) => ({
    x: fpr,
    y: roc.tpr?.[index] ?? 0,
  }));

const mapPr = (pr) =>
  (pr?.recall || []).map((recall, index) => ({
    x: recall,
    y: pr.precision?.[index] ?? 0,
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
      {matrix.map((row, rowIndex) => (
        <div className="matrix-row" key={`row-${rowIndex}`}>
          <span className="matrix-label">{labels[rowIndex]}</span>
          {row.map((cell, cellIndex) => (
            <span className="matrix-cell" key={`cell-${rowIndex}-${cellIndex}`}>
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

function ModelLab({ sport = "Football" }) {
  const sportKey = toSportKey(sport);
  const [metrics, setMetrics] = useState(null);
  const [compare, setCompare] = useState(null);
  const [algo, setAlgo] = useState("logistic");
  const [activeModel, setActiveModel] = useState("logistic");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const params = { sport: sportKey };
      const [singleRes, compareRes, activeRes] = await Promise.all([
        api.get("/ai/metrics", { params }),
        api.get("/ai/metrics/compare", { params }),
        api.get("/ai/model/active", { params }),
      ]);

      setMetrics(singleRes.data);
      setCompare(compareRes.data);
      setActiveModel(activeRes.data?.active || "logistic");

      const hasCompare =
        compareRes.data?.logistic?.accuracy !== undefined || compareRes.data?.rf?.accuracy !== undefined;
      if (!hasCompare) {
        const form = new FormData();
        form.append("sport", sportKey);
        await api.post("/ai/train/compare", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const refreshed = await api.get("/ai/metrics/compare", { params });
        setCompare(refreshed.data);
      }
    } catch (error) {
      setMetrics(null);
      setCompare(null);
      setMessage(
        error?.response?.data?.error || "Impossible de charger les metriques. Verifie le service IA."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [sportKey]);

  const triggerTraining = async () => {
    setLoading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("algo", algo);
      form.append("sport", sportKey);
      await api.post("/ai/train/refresh", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(`Entrainement ${sport.toLowerCase()} relance.`);

      const compareForm = new FormData();
      compareForm.append("sport", sportKey);
      await api.post("/ai/train/compare", compareForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadMetrics();
    } catch (error) {
      const details = error?.response?.data?.details || error?.response?.data?.error;
      setMessage(
        details
          ? `Impossible de relancer l entrainement: ${details}`
          : "Impossible de relancer l entrainement. Verifie le service IA."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectActive = async (value) => {
    setLoading(true);
    setMessage("");
    try {
      await api.post("/ai/model/select", { sport: sportKey, model: value });
      setActiveModel(value);
      setMessage(`Modele actif ${sport.toLowerCase()}: ${value}.`);
      await loadMetrics();
    } catch (error) {
      const details = error?.response?.data?.details || error?.response?.data?.error;
      setMessage(
        details
          ? `Impossible de changer le modele actif: ${details}`
          : "Impossible de changer le modele actif."
      );
    } finally {
      setLoading(false);
    }
  };

  const importanceEntries = useMemo(() => {
    const importance = metrics?.feature_importance || {};
    return Object.entries(importance).sort((a, b) => b[1] - a[1]);
  }, [metrics]);

  const compareEntries = useMemo(() => {
    if (!compare) return [];
    return [
      { key: "logistic", label: "Logistic Regression", data: compare.logistic },
      { key: "rf", label: "Random Forest", data: compare.rf },
    ];
  }, [compare]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Laboratoire IA ({sport})</p>
          <h1>Comparer et ajuster le modele</h1>
          <p className="lead">Chaque sport a son propre entrainement, ses courbes et son modele actif.</p>
        </div>
        <div className="model-actions">
          <select value={algo} onChange={(event) => setAlgo(event.target.value)}>
            {algoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="button primary" onClick={triggerTraining} disabled={loading}>
            {loading ? "Entrainement..." : "Relancer l entrainement"}
          </button>
        </div>
      </div>

      {message ? <p className="hint">{message}</p> : null}

      <section className="grid-two">
        <div className="panel">
          <div className="section-head">
            <h2>Metriques du modele actif</h2>
            <p>Dernier entrainement du sport selectionne.</p>
          </div>
          <div className="score-grid">
            <div>
              <span>Modele</span>
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
            <p>Modele actif</p>
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
            <h2>Features influentes</h2>
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
          <h2>Comparatif logistic vs random forest</h2>
          <p>Resultats cote a cote sur le dataset {sport.toLowerCase()}.</p>
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
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Courbes ROC par classe</h2>
          <p>home_win / draw / away_win par modele.</p>
        </div>
        {compareEntries.map((entry) => (
          <div key={entry.key} className="curve-section">
            <h3>{entry.label}</h3>
            <div className="curve-grid">
              {Object.entries(entry.data?.roc || {}).map(([label, roc]) => (
                <CurveCard
                  key={`${entry.key}-roc-${label}`}
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
          <h2>Courbes Precision-Recall</h2>
          <p>PR par classe et par modele.</p>
        </div>
        {compareEntries.map((entry) => (
          <div key={entry.key} className="curve-section">
            <h3>{entry.label}</h3>
            <div className="curve-grid">
              {Object.entries(entry.data?.pr || {}).map(([label, pr]) => (
                <CurveCard
                  key={`${entry.key}-pr-${label}`}
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
            <p>Modele actif pour {sport.toLowerCase()}.</p>
          </div>
          <ConfusionTable matrix={metrics?.confusion_matrix} labels={metrics?.classes || []} />
        </div>
        <div className="panel">
          <div className="section-head">
            <h2>Etat modele</h2>
            <p>Modele actif: {activeModel}</p>
          </div>
          <p className="hint">
            Le changement de modele est isole par sport. Le football et le basketball peuvent avoir des
            modeles actifs differents.
          </p>
        </div>
      </section>
    </div>
  );
}

export default ModelLab;
