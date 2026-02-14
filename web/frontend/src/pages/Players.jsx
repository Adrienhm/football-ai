import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { toSportKey } from "../services/sports";

const sortOptions = [
  { value: "goals", label: "Buts/Points" },
  { value: "xg", label: "xG/Production" },
  { value: "minutes", label: "Minutes" },
];

function Players({ sport = "Football" }) {
  const sportKey = toSportKey(sport);
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState("goals");

  useEffect(() => {
    api
      .get("/players", { params: { sport: sportKey } })
      .then((res) => setPlayers(res.data))
      .catch(() => setPlayers([]));
  }, [sportKey]);

  useEffect(() => {
    setFilter("");
    setTeamFilter("all");
  }, [sportKey]);

  const teams = useMemo(() => {
    const list = Array.from(new Set(players.map((p) => p.team)));
    return ["all", ...list];
  }, [players]);

  const filtered = useMemo(() => {
    let result = players;
    if (teamFilter !== "all") {
      result = result.filter((player) => player.team === teamFilter);
    }
    if (filter) {
      const term = filter.toLowerCase();
      result = result.filter((player) =>
        `${player.name} ${player.team} ${player.position}`.toLowerCase().includes(term)
      );
    }
    return [...result].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]));
  }, [players, filter, teamFilter, sortBy]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Joueurs ({sport})</p>
          <h1>Statistiques et forme par sport</h1>
          <p className="lead">
            Chaque sport charge son roster, ses equipes et ses indicateurs de performance.
          </p>
        </div>
        <div className="player-controls">
          <input
            className="input"
            placeholder="Chercher un joueur ou une equipe"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team === "all" ? "Toutes les equipes" : team}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Trier par {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="player-grid">
        {filtered.map((player) => (
          <div className="player-card" key={player.id}>
            <div className="player-head">
              <div>
                <h3>{player.name}</h3>
                <span>
                  {player.team} - {player.position}
                </span>
              </div>
              <div className="player-form">
                <span>Forme</span>
                <strong>{player.form}</strong>
              </div>
            </div>
            <div className="player-stats">
              <div>
                <span>Minutes</span>
                <strong>{player.minutes}</strong>
              </div>
              <div>
                <span>Buts/Points</span>
                <strong>{player.goals}</strong>
              </div>
              <div>
                <span>Passes</span>
                <strong>{player.assists}</strong>
              </div>
              <div>
                <span>Tirs</span>
                <strong>{player.shots}</strong>
              </div>
              <div>
                <span>xG/Prod</span>
                <strong>{player.xg}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Players;
