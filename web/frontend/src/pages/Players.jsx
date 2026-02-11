import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const sortOptions = [
  { value: "goals", label: "Buts" },
  { value: "xg", label: "xG" },
  { value: "minutes", label: "Minutes" },
];

function Players() {
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState("goals");

  useEffect(() => {
    api.get("/players").then((res) => setPlayers(res.data)).catch(() => {
      setPlayers([]);
    });
  }, []);

  const teams = useMemo(() => {
    const list = Array.from(new Set(players.map((p) => p.team)));
    return ["all", ...list];
  }, [players]);

  const filtered = useMemo(() => {
    let result = players;
    if (teamFilter !== "all") {
      result = result.filter((p) => p.team === teamFilter);
    }
    if (filter) {
      const term = filter.toLowerCase();
      result = result.filter((p) =>
        `${p.name} ${p.team} ${p.position}`.toLowerCase().includes(term)
      );
    }
    return [...result].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]));
  }, [players, filter, teamFilter, sortBy]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Joueurs</p>
          <h1>Statistiques et forme des joueurs</h1>
          <p className="lead">
            Données synthétiques réalistes : minutes, xG, buts, passes et forme récente.
          </p>
        </div>
        <div className="player-controls">
          <input
            className="input"
            placeholder="Chercher un joueur ou une équipe"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team === "all" ? "Toutes les equipes" : team}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Trier par {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="player-grid">
        {filtered.map((p) => (
          <div className="player-card" key={p.id}>
            <div className="player-head">
              <div>
                <h3>{p.name}</h3>
                <span>{p.team} � {p.position}</span>
              </div>
              <div className="player-form">
                <span>Forme</span>
                <strong>{p.form}</strong>
              </div>
            </div>
            <div className="player-stats">
              <div>
                <span>Minutes</span>
                <strong>{p.minutes}</strong>
              </div>
              <div>
                <span>Buts</span>
                <strong>{p.goals}</strong>
              </div>
              <div>
                <span>Passes</span>
                <strong>{p.assists}</strong>
              </div>
              <div>
                <span>Tirs</span>
                <strong>{p.shots}</strong>
              </div>
              <div>
                <span>xG</span>
                <strong>{p.xg}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Players;
