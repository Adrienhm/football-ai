import { useEffect, useState } from "react";
import { api } from "../services/api";

function DataHub() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ingest, setIngest] = useState({ competitionId: "", seasonId: "" });
  const [message, setMessage] = useState("");

  const loadMetrics = () => {
    setLoading(true);
    api
      .get("/ai/metrics")
      .then((res) => setMetrics(res.data))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/ai/train", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMetrics(res.data.metrics || null);
      setMessage("Modele re-entraine avec le CSV.");
    } catch (err) {
      setMessage("Echec de l'entrainement. Verifie le service IA.");
    } finally {
      setUploading(false);
    }
  };

  const handleIngest = async () => {
    setUploading(true);
    setMessage("");
    try {
      const payload = {
        competitionId: ingest.competitionId ? Number(ingest.competitionId) : null,
        seasonId: ingest.seasonId ? Number(ingest.seasonId) : null,
      };
      const res = await api.post("/ai/ingest/statsbomb", payload);
      setMetrics(res.data.metrics || null);
      setMessage(
        `StatsBomb importe: ${res.data.rows} matchs (competition ${res.data.competition_id}, saison ${res.data.season_id}).`
      );
    } catch (err) {
      setMessage("Import StatsBomb impossible. Verifie l'acces reseau.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Centre de données</p>
          <h1>Jeux de données et scoring</h1>
          <p className="lead">
            Dataset local CSV, versioning modèle et suivi des métriques.
          </p>
        </div>
        <label className="button secondary">
          {uploading ? "Import en cours..." : "Importer un CSV"}
          <input type="file" accept=".csv" onChange={handleUpload} hidden />
        </label>
      </div>

      {message ? <p className="hint">{message}</p> : null}

      <section className="grid-two">
        <div className="panel">
          <div className="section-head">
          <h2>Jeu de données principal</h2>
            <p>Source: ai/data/matches.csv</p>
          </div>
          <ul className="dataset-list">
            <li>Features numériques: strength, form, xG, shots, possession.</li>
            <li>Labels: home_win / draw / away_win</li>
            <li>Import CSV direct depuis l'interface.</li>
          </ul>
          <div className="ingest-box">
            <p>Importer depuis StatsBomb Open Data</p>
            <div className="ingest-fields">
              <input
                type="number"
                placeholder="competitionId (optionnel)"
                value={ingest.competitionId}
                onChange={(e) => setIngest((prev) => ({ ...prev, competitionId: e.target.value }))}
              />
              <input
                type="number"
                placeholder="seasonId (optionnel)"
                value={ingest.seasonId}
                onChange={(e) => setIngest((prev) => ({ ...prev, seasonId: e.target.value }))}
              />
              <button className="button ghost" onClick={handleIngest} disabled={uploading}>
                Importer StatsBomb
              </button>
            </div>
            <p className="hint">Sans IDs, le premier championnat disponible est importé.</p>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Scoring IA</h2>
            <p>Résultats du dernier entrainement.</p>
          </div>
          {loading ? (
            <p className="hint">Chargement des métriques...</p>
          ) : (
            <div className="score-grid">
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
              <div>
                <span>Rows</span>
                <strong>{metrics?.rows ?? "-"}</strong>
              </div>
            </div>
          )}
          <button className="button ghost" onClick={loadMetrics}>
            Rafraichir les métriques
          </button>
        </div>
      </section>
    </div>
  );
}

export default DataHub;
