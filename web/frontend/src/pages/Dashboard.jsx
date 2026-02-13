import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const trendPoints = [12, 18, 15, 22, 28, 24, 30];
const xgTrend = [0.9, 1.4, 1.1, 1.7, 2.2, 1.8, 2.0];

const heatmapPattern = [
  1, 1, 2, 3, 4, 3, 2, 2, 3, 4, 3, 2,
  1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 3,
  1, 2, 2, 3, 4, 3, 2, 2, 3, 4, 3, 2,
  1, 1, 2, 2, 3, 2, 1, 1, 2, 2, 2, 1,
  1, 1, 1, 2, 2, 2, 1, 1, 1, 2, 2, 1,
];

function Dashboard({ sport = "Football" }) {
  const [matches, setMatches] = useState([]);
  const [animateHeat, setAnimateHeat] = useState(true);
  const [reportStatus, setReportStatus] = useState("");
  const [reporting, setReporting] = useState(false);

  const isFootball = sport === "Football";

  useEffect(() => {
    api
      .get("/matches")
      .then((res) => setMatches(res.data))
      .catch(() => setMatches([]));
  }, []);

  const stats = useMemo(() => {
    if (!matches.length) {
      return {
        total: 0,
        avgGoals: 0,
        homeWinRate: 0,
        volatility: 0,
      };
    }

    const totalGoals = matches.reduce(
      (sum, m) => sum + (Number(m.scoreA) || 0) + (Number(m.scoreB) || 0),
      0
    );
    const homeWins = matches.filter((m) => Number(m.scoreA) > Number(m.scoreB)).length;
    const draws = matches.filter((m) => Number(m.scoreA) === Number(m.scoreB)).length;

    return {
      total: matches.length,
      avgGoals: (totalGoals / matches.length).toFixed(2),
      homeWinRate: ((homeWins / matches.length) * 100).toFixed(1),
      volatility: ((draws / matches.length) * 100).toFixed(1),
    };
  }, [matches]);

  const buildReportHtml = () => {
    const rows = matches.slice(0, 10).map((m) => {
      const date = m.date || "date inconnue";
      return `<tr><td>${m.teamA}</td><td>${m.scoreA}</td><td>${m.scoreB}</td><td>${m.teamB}</td><td>${date}</td></tr>`;
    });

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Sport AI - Rapport</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0f1715; color: #f4f7f2; padding: 24px; }
    h1 { margin: 0 0 8px; }
    .meta { color: #aab8b0; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .card { background: #121b18; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid rgba(255,255,255,0.1); padding: 8px; text-align: left; }
    th { color: #aab8b0; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Sport AI - Rapport de performance (${sport})</h1>
  <div class="meta">Genere le: ${new Date().toLocaleString("fr-FR")}</div>
  <div class="grid">
    <div class="card"><strong>Matchs analyses</strong><div>${stats.total}</div></div>
    <div class="card"><strong>${isFootball ? "Moyenne de buts" : "Points moyens"}</strong><div>${stats.avgGoals}</div></div>
    <div class="card"><strong>Victoire equipe A</strong><div>${stats.homeWinRate}%</div></div>
    <div class="card"><strong>Volatilite (nuls)</strong><div>${stats.volatility}%</div></div>
  </div>
  <h2>Derniers matchs</h2>
  <table>
    <thead>
      <tr><th>Equipe A</th><th>Score A</th><th>Score B</th><th>Equipe B</th><th>Date</th></tr>
    </thead>
    <tbody>
      ${rows.length ? rows.join("") : "<tr><td colspan=\"5\">Aucun match disponible.</td></tr>"}
    </tbody>
  </table>
</body>
</html>`;
  };

  const generateTxtReport = () => {
    setReporting(true);
    try {
      const now = new Date();
      const reportLines = [
        `Sport AI - Rapport de performance (${sport})`,
        `Genere le: ${now.toLocaleString("fr-FR")}`,
        "",
        "Synthese",
        `- Matchs analyses: ${stats.total}`,
        `- ${isFootball ? "Moyenne de buts" : "Points moyens"}: ${stats.avgGoals}`,
        `- Victoire equipe A: ${stats.homeWinRate}%`,
        `- Volatilite (nuls): ${stats.volatility}%`,
        "",
        "Derniers matchs",
      ];

      if (!matches.length) {
        reportLines.push("- Aucun match disponible.");
      } else {
        matches.slice(0, 10).forEach((m) => {
          reportLines.push(
            `- ${m.teamA} ${m.scoreA} - ${m.scoreB} ${m.teamB} (${m.date || "date inconnue"})`
          );
        });
      }

      const blob = new Blob([reportLines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sport-ai-${sport.toLowerCase()}-rapport-${now.toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setReportStatus("Rapport TXT genere et telecharge.");
    } catch {
      setReportStatus("Impossible de generer le rapport TXT.");
    } finally {
      setReporting(false);
    }
  };

  const generateHtmlReport = () => {
    setReporting(true);
    try {
      const html = buildReportHtml();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sport-ai-${sport.toLowerCase()}-rapport-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setReportStatus("Rapport HTML genere et telecharge.");
    } catch {
      setReportStatus("Impossible de generer le rapport HTML.");
    } finally {
      setReporting(false);
    }
  };

  const generateCsvExport = async () => {
    setReporting(true);
    try {
      const res = await api.get("/report/csv", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sport-ai-${sport.toLowerCase()}-matches-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setReportStatus("Export CSV telecharge.");
    } catch {
      setReportStatus("Impossible d'exporter le CSV.");
    } finally {
      setReporting(false);
    }
  };

  const generatePdfReport = async () => {
    setReporting(true);
    try {
      const res = await api.get("/report/pdf", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sport-ai-${sport.toLowerCase()}-rapport-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setReportStatus("Rapport PDF genere et telecharge.");
    } catch {
      setReportStatus("Impossible de generer le rapport PDF.");
    } finally {
      setReporting(false);
    }
  };

  const heatCells = isFootball ? heatmapPattern : heatmapPattern.slice(0, 40);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h1>Suivi temps reel des performances ({sport})</h1>
          <p className="lead">
            Synthese IA des tendances, formes d'equipe et alertes de risque multi-sports.
          </p>
        </div>
        <div className="button-group">
          <button className="button ghost" onClick={generateTxtReport} disabled={reporting}>
            TXT
          </button>
          <button className="button ghost" onClick={generateCsvExport} disabled={reporting}>
            Export CSV
          </button>
          <button className="button secondary" onClick={generateHtmlReport} disabled={reporting}>
            Rapport HTML
          </button>
          <button className="button primary" onClick={generatePdfReport} disabled={reporting}>
            {reporting ? "Generation..." : "Rapport PDF"}
          </button>
        </div>
      </div>

      {reportStatus ? <p className="hint">{reportStatus}</p> : null}

      <section className="kpi-grid">
        <article className="kpi-card">
          <p>Matchs analyses</p>
          <strong>{stats.total}</strong>
          <span>Sur la periode recente</span>
        </article>
        <article className="kpi-card">
          <p>{isFootball ? "Moyenne de buts" : "Points moyens"}</p>
          <strong>{stats.avgGoals}</strong>
          <span>Par rencontre</span>
        </article>
        <article className="kpi-card">
          <p>Victoire equipe A</p>
          <strong>{stats.homeWinRate}%</strong>
          <span>Impact domicile/terrain</span>
        </article>
        <article className="kpi-card">
          <p>Volatilite (nuls)</p>
          <strong>{stats.volatility}%</strong>
          <span>Matchs equilibres</span>
        </article>
      </section>

      <section className="grid-two">
        <div className="panel">
          <div className="section-head">
            <h2>Indice de forme collectif</h2>
            <p>Score agrege des 7 derniers cycles.</p>
          </div>
          <div className="chart">
            <svg viewBox="0 0 240 120" role="img" aria-label="Form trend">
              <polyline
                fill="none"
                stroke="url(#grad)"
                strokeWidth="4"
                points={trendPoints
                  .map((point, index) => `${index * 35},${110 - point * 3}`)
                  .join(" ")}
              />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#49e26f" />
                  <stop offset="100%" stopColor="#f7c948" />
                </linearGradient>
              </defs>
            </svg>
            <div className="chart-legend">
              <span>Base</span>
              <span>Pic de forme</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Alertes IA prioritaires</h2>
            <p>Dernieres anomalies detectees.</p>
          </div>
          <ul className="alerts">
            <li>
              <strong>Risque de blessure</strong>
              <span>Charge elevee detectee sur le dernier cycle.</span>
            </li>
            <li>
              <strong>Fatigue collective</strong>
              <span>Baisse d'intensite dans le dernier tiers du match.</span>
            </li>
            <li>
              <strong>Opportunite tactique</strong>
              <span>Zone forte exploitable identifiee par l'IA.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="grid-two">
        <div className="panel">
          <div className="section-head">
            <h2>{isFootball ? "Tendance xG" : "Tendance offensive"}</h2>
            <p>
              {isFootball
                ? "Evolution des expected goals sur 7 cycles."
                : "Evolution d'un indice offensif sur 7 cycles."}
            </p>
          </div>
          <div className="chart">
            <svg viewBox="0 0 240 120" role="img" aria-label="Offensive trend">
              <polyline
                fill="none"
                stroke="#4ad6ff"
                strokeWidth="4"
                points={xgTrend
                  .map((point, index) => `${index * 35},${110 - point * 35}`)
                  .join(" ")}
              />
            </svg>
            <div className="chart-legend">
              <span>{isFootball ? "xG bas" : "Indice bas"}</span>
              <span>{isFootball ? "xG haut" : "Indice haut"}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Chronologie de la rencontre</h2>
            <p>Moments cles et zones d'impact.</p>
          </div>
          <div className="timeline">
            <div className="timeline-row">
              <span>10'</span>
              <div className="timeline-bar">
                <div className="timeline-event high" style={{ width: "15%" }} />
              </div>
              <span>Pressing haut</span>
            </div>
            <div className="timeline-row">
              <span>34'</span>
              <div className="timeline-bar">
                <div className="timeline-event medium" style={{ width: "48%" }} />
              </div>
              <span>Transition rapide</span>
            </div>
            <div className="timeline-row">
              <span>71'</span>
              <div className="timeline-bar">
                <div className="timeline-event low" style={{ width: "72%" }} />
              </div>
              <span>Baisse de regime</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>{isFootball ? "Carte thermique d'occupation" : "Carte des zones d'impact"}</h2>
            <p>
              {isFootball
                ? "Zones de presence moyenne sur 90 minutes."
                : "Visualisation generique des zones de presence."}
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={animateHeat}
              onChange={(e) => setAnimateHeat(e.target.checked)}
            />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            <span>Animation</span>
          </label>
        </div>
        <div className={`pitch ${animateHeat ? "heat-animate" : "heat-static"}`}>
          {isFootball ? (
            <div className="pitch-lines">
              <span className="pitch-half" />
              <span className="pitch-circle" />
              <span className="pitch-spot" />
              <span className="pitch-box left" />
              <span className="pitch-box right" />
              <span className="pitch-pen left" />
              <span className="pitch-pen right" />
              <span className="pitch-goal left" />
              <span className="pitch-goal right" />
              <span className="pitch-arc left" />
              <span className="pitch-arc right" />
              <span className="pitch-pen-spot left" />
              <span className="pitch-pen-spot right" />
              <span className="pitch-corner tl" />
              <span className="pitch-corner tr" />
              <span className="pitch-corner bl" />
              <span className="pitch-corner br" />
            </div>
          ) : null}
          <div className={isFootball ? "heatmap-grid" : "heatmap"}>
            {heatCells.map((level, idx) => (
              <span key={idx} className={`heatmap-cell heat-${level}`} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
