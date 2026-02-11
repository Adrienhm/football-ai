import { useEffect, useState } from "react";
import { api } from "../services/api";

function Matches() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api.get("/matches").then((res) => setMatches(res.data));
  }, []);

  return (
    <div className="matches">
      <div className="section-head">
        <h2>Matchs récents</h2>
        <p>Suivi des scores et tendances d'équipes en temps réel.</p>
      </div>

      {matches.length === 0 ? (
        <div className="empty">
          <p>Aucun match disponible pour le moment.</p>
          <span>Connecte la source de données pour alimenter le flux.</span>
        </div>
      ) : (
        <div className="match-list">
          {matches.map((m, i) => (
            <div className="match-card" key={`${m.teamA}-${m.teamB}-${i}`}>
              <div>
                <p className="match-label">{m.teamA}</p>
                <strong>{m.scoreA}</strong>
              </div>
              <div className="match-vs">VS</div>
              <div>
                <p className="match-label">{m.teamB}</p>
                <strong>{m.scoreB}</strong>
              </div>
              <div className="match-meta">
                <span>Forme: {m.form || "Stable"}</span>
                <span>Risque: {m.risk || "Modere"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Matches;
