import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { toSportKey } from "../services/sports";

function DataHub({ sport = "Football" }) {
  const sportKey = toSportKey(sport);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ingest, setIngest] = useState({ competitionId: "", seasonId: "" });
  const [message, setMessage] = useState("");

  const canIngestStatsBomb = useMemo(() => sportKey === "football", [sportKey]);

  const loadMetrics = () => {
    setLoading(true);
    api
      .get("/ai/metrics", { params: { sport: sportKey } })
      .then((res) => setMetrics(res.data))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setMessage("");
    loadMetrics();
  }, [sportKey]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sport", sportKey);
      const res = await api.post("/ai/train", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMetrics(res.data.metrics || null);
      setMessage(`Modele ${sport.toLowerCase()} re-entraine avec le CSV.`);
    } catch {
      setMessage("Echec de l entrainement. Verifie le service IA.");
    } finally {
      setUploading(false);
    }
  };

  const handleIngest = async () => {
    setUploading(true);
    setMessage("");
    try {
      const payload = {
        sport: sportKey,
        competitionId: ingest.competitionId ? Number(ingest.competitionId) : null,
        seasonId: ingest.seasonId ? Number(ingest.seasonId) : null,
      };
      const res = await api.post("/ai/ingest/statsbomb", payload);
      setMetrics(res.data.metrics || null);
      setMessage(
        `StatsBomb importe: ${res.data.rows} matchs (competition ${res.data.competition_id}, saison ${res.data.season_id}).`
      );
    } catch (error) {
      const details = error?.response?.data?.detail || "Import impossible.";
      setMessage(String(details));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Data Hub ({sport})</p>
          <h1>Dataset et scoring dedies</h1>
          <p className="lead">
            Chaque sport a son propre fichier de donnees et son propre cycle de training.
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
            <h2>Jeu de donnees principal</h2>
            <p>Source: ai/data/{sportKey}_matches.csv</p>
          </div>
          <ul className="dataset-list">
            <li>Features: strength, form, xG, injuries, shots, possession.</li>
            <li>Labels: home_win / draw / away_win.</li>
            <li>Le fichier importe est applique uniquement a {sport.toLowerCase()}.</li>
          </ul>

          <div className="ingest-box">
            <p>Import externe</p>
            {canIngestStatsBomb ? (
              <div className="ingest-fields">
                <input
                  type="number"
                  placeholder="competitionId (optionnel)"
                  value={ingest.competitionId}
                  onChange={(event) =>
                    setIngest((prev) => ({ ...prev, competitionId: event.target.value }))
                  }
                />
                <input
                  type="number"
                  placeholder="seasonId (optionnel)"
                  value={ingest.seasonId}
                  onChange={(event) => setIngest((prev) => ({ ...prev, seasonId: event.target.value }))}
                />
                <button className="button ghost" onClick={handleIngest} disabled={uploading}>
                  Importer StatsBomb
                </button>
              </div>
            ) : (
              <p className="hint">StatsBomb Open Data est disponible uniquement pour le football.</p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Scoring IA</h2>
            <p>Dernieres metriques du modele {sport.toLowerCase()}.</p>
          </div>
          {loading ? (
            <p className="hint">Chargement des metriques...</p>
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
            Rafraichir les metriques
          </button>
        </div>
      </section>
    </div>
  );
}

export default DataHub;
