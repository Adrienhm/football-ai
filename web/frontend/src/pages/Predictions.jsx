import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { toSportKey } from "../services/sports";

const presetsBySport = {
  football: {
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
  },
  basketball: {
    strengthA: 84,
    strengthB: 81,
    formA: 0.74,
    formB: 0.69,
    xgA: 106,
    xgB: 99,
    injuriesA: 1,
    injuriesB: 1,
    shotsA: 88,
    shotsB: 84,
    possessionA: 51,
    possessionB: 49,
  },
  tennis: {
    strengthA: 86,
    strengthB: 82,
    formA: 0.79,
    formB: 0.72,
    xgA: 2.4,
    xgB: 1.8,
    injuriesA: 0,
    injuriesB: 0,
    shotsA: 10,
    shotsB: 8,
    possessionA: 50,
    possessionB: 50,
  },
  rugby: {
    strengthA: 83,
    strengthB: 79,
    formA: 0.72,
    formB: 0.68,
    xgA: 28,
    xgB: 24,
    injuriesA: 1,
    injuriesB: 1,
    shotsA: 22,
    shotsB: 20,
    possessionA: 52,
    possessionB: 48,
  },
  handball: {
    strengthA: 81,
    strengthB: 77,
    formA: 0.73,
    formB: 0.67,
    xgA: 33,
    xgB: 29,
    injuriesA: 1,
    injuriesB: 1,
    shotsA: 44,
    shotsB: 40,
    possessionA: 53,
    possessionB: 47,
  },
};

function Predictions({ sport = "Football" }) {
  const sportKey = toSportKey(sport);
  const initialState = useMemo(() => presetsBySport[sportKey] || presetsBySport.football, [sportKey]);
  const [inputs, setInputs] = useState(initialState);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setInputs((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const resetPreset = () => {
    setInputs(initialState);
    setResult(null);
    setError("");
  };

  useEffect(() => {
    setInputs(initialState);
    setResult(null);
    setError("");
  }, [initialState]);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/predict", { ...inputs, sport: sportKey });
      setResult(res.data);
    } catch {
      setError("Prediction indisponible. Verifie le service IA.");
    } finally {
      setLoading(false);
    }
  };

  const probs = result?.probabilities || {};

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Prediction IA ({sport})</p>
          <h1>Simulation de match en temps reel</h1>
          <p className="lead">Chaque sport utilise son modele actif et son dataset dedie.</p>
        </div>
        <div className="button-group">
          <button className="button ghost" onClick={resetPreset}>
            Reinitialiser
          </button>
          <button className="button primary" onClick={submit} disabled={loading}>
            {loading ? "Analyse..." : "Lancer la prediction"}
          </button>
        </div>
      </div>

      <section className="grid-two">
        <div className="panel">
          <div className="section-head">
            <h2>Parametres de simulation</h2>
            <p>Variables sportives alimentees vers le modele {sport.toLowerCase()}.</p>
          </div>

          <div className="form-grid">
            {Object.entries(inputs).map(([key, value]) => (
              <label className="field" key={key}>
                <span>{key}</span>
                <input type="number" step="0.1" name={key} value={value} onChange={handleChange} />
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Resultat IA</h2>
            <p>Probabilites calculees avec le modele actif du sport selectionne.</p>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {!result ? (
            <p className="hint">Lance une simulation pour afficher la prediction.</p>
          ) : (
            <div className="result-card">
              <div>
                <span>Prediction</span>
                <strong>{result.prediction}</strong>
              </div>
              <div>
                <span>Confiance</span>
                <strong>{Math.round((result.confidence || 0) * 100)}%</strong>
              </div>
              <div>
                <span>Score d avantage</span>
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
