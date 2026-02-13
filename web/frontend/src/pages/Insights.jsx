function Insights() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Analyses</p>
          <h1>Recommandations tactiques</h1>
          <p className="lead">
            L'IA identifie les zones a fort impact, les risques et les actions clé.
          </p>
        </div>
        <button className="button ghost">Exporter</button>
      </div>

      <section className="grid-two">
        <div className="panel">
          <div className="section-head">
            <h2>Zones de création</h2>
            <p>Opportunités détectées par l'IA.</p>
          </div>
          <ul className="insight-list">
            <li>
              <strong>Couloir gauche</strong>
              <span>45% des actions dangereuses proviennent de cette zone.</span>
            </li>
            <li>
              <strong>Transition rapide</strong>
              <span>Temps moyen de 7.4s pour atteindre la surface.</span>
            </li>
            <li>
              <strong>Pressing haut</strong>
              <span>Récupération moyenne a 32m du but adverse.</span>
            </li>
          </ul>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Charge et forme</h2>
            <p>Qualité physique observée sur 5 matchs.</p>
          </div>
          <div className="load-grid">
            <div>
              <span>Charge moyenne</span>
              <strong>82%</strong>
            </div>
            <div>
              <span>Pic d'intensité</span>
              <strong>91%</strong>
            </div>
            <div>
              <span>Récupération</span>
              <strong>68%</strong>
            </div>
            <div>
              <span>Risque blessure</span>
              <strong>Modere</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Insights;
