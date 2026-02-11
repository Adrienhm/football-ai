import { useState } from "react";
import { api } from "../services/api";

const initialState = {
  strengthA: 78,
  strengthB: 72,
  formA: 0.7,
  formB: 0.62,
  xgA: 1.9,
  xgB: 1.4,
  injuriesA: 1,
  injuriesB: 2,
  shotsA: 15,
  shotsB: 11,
  possessionA: 55,
  possessionB: 45,
};

function Predictions() {
  const [inputs, setInputs] = useState(initialState);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/predict", inputs);
      setResult(res.data);
    } catch (err) {
      setError("Prédiction indisponible. Vérifie le service IA.");
    } finally {
      setLoading(false);
    }
  };

  const probs = result?.probabilities || {};

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Prédiction IA</p>
          <h1>Simulation d'un match en temps réel</h1>
          <p className="lead">
            Ajuste les variables, lance la prédiction et observe le scoring IA.
          </p>
        </div>
        <button className="button primary" onClick={submit} disabled={loading}>
          {loading ? "Analyse..." : "Lancer la prédiction"}
        </button>
      </div>

      <section className="grid-two">
        <div className="panel">
          <div className="section-head">
            <h2>Paramètres de match</h2>
            <p>Données historiques et forme récente.</p>
          </div>

          <div className="form-grid">
            {Object.entries(inputs).map(([key, value]) => (
              <label className="field" key={key}>
                <span>{key}</span>
                <input
                  type="number"
                  step="0.1"
                  name={key}
                  value={value}
                  onChange={handleChange}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Résultat IA</h2>
            <p>Lecture directe des probabilités du modèle.</p>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {!result ? (
            <p className="hint">Lance une simulation pour afficher les scores.</p>
          ) : (
            <div className="result-card">
              <div>
                <span>Prédiction</span>
                <strong>{result.prediction}</strong>
              </div>
              <div>
                <span>Confiance</span>
                <strong>{Math.round((result.confidence || 0) * 100)}%</strong>
              </div>
              <div>
                <span>Score d'avantage</span>
                <strong>{(result.score || 0).toFixed(2)}</strong>
              </div>
            </div>
          )}

          <div className="probabilities">
            {Object.entries(probs).map(([label, value]) => (
              <div className="prob-row" key={label}>
                <span>{label}</span>
                <div className="prob-bar">
                  <div style={{ width: `${Math.round(value * 100)}%` }} />
                </div>
                <strong>{Math.round(value * 100)}%</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Predictions;
