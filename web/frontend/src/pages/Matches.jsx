import { useEffect, useState } from "react";
import { api } from "../services/api";
import { toSportKey } from "../services/sports";

function Matches({ sport = "Football" }) {
  const sportKey = toSportKey(sport);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api
      .get("/matches", { params: { sport: sportKey } })
      .then((res) => setMatches(res.data))
      .catch(() => setMatches([]));
  }, [sportKey]);

  return (
    <div className="matches">
      <div className="section-head">
        <h2>Matchs recents - {sport}</h2>
        <p>Flux dedie par sport avec ses propres donnees et ses propres scores.</p>
      </div>

      {matches.length === 0 ? (
        <div className="empty">
          <p>Aucun match disponible pour {sport.toLowerCase()}.</p>
          <span>Connecte une source de donnees ou importe un dataset.</span>
        </div>
      ) : (
        <div className="match-list">
          {matches.map((match, index) => (
            <div className="match-card" key={`${match.teamA}-${match.teamB}-${index}`}>
              <div>
                <p className="match-label">{match.teamA}</p>
                <strong>{match.scoreA}</strong>
              </div>
              <div className="match-vs">VS</div>
              <div>
                <p className="match-label">{match.teamB}</p>
                <strong>{match.scoreB}</strong>
              </div>
              <div className="match-meta">
                <span>Sport: {sport}</span>
                <span>Date: {match.date || "-"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Matches;
