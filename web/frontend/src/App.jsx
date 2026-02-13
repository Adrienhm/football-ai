import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./services/api";
import Dashboard from "./pages/Dashboard";
import Predictions from "./pages/Predictions";
import Matches from "./pages/Matches";
import Insights from "./pages/Insights";
import DataHub from "./pages/DataHub";
import ModelLab from "./pages/ModelLab";
import Players from "./pages/Players";
import Login from "./pages/Login";
import "./App.css";

function ProtectedRoute({ authed, children }) {
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function App() {
  const sportOptions = ["Football", "Basketball", "Tennis", "Rugby", "Handball"];
  const [aiStatus, setAiStatus] = useState("checking");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [topbarMessage, setTopbarMessage] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [activeSport, setActiveSport] = useState(
    () => localStorage.getItem("sai_active_sport") || "Football"
  );
  const [authState, setAuthState] = useState(() => {
    const token = localStorage.getItem("fai_token");
    const rawUser = localStorage.getItem("fai_user");
    return {
      token: token || null,
      user: rawUser ? JSON.parse(rawUser) : null,
    };
  });
  const navigate = useNavigate();

  const authed = useMemo(() => Boolean(authState.token), [authState.token]);

  const checkAi = async () => {
    try {
      await api.get("/ai/health");
      setAiStatus("online");
      setShowOnboarding(false);
    } catch (err) {
      setAiStatus("offline");
      setShowOnboarding(true);
    }
  };

  useEffect(() => {
    if (authed) {
      checkAi();
      const timer = setInterval(checkAi, 10000);
      return () => clearInterval(timer);
    }
  }, [authed]);

  const startAi = async () => {
    setStarting(true);
    try {
      await api.post("/system/start-ai");
      setTimeout(checkAi, 3000);
    } finally {
      setStarting(false);
    }
  };

  const handleShare = async () => {
    setShowShare(true);
  };

  const handleNewSimulation = () => {
    navigate("/predictions");
    setTopbarMessage(`Nouvelle simulation ${activeSport} prête.`);
  };

  const handleLogin = async (payload) => {
    const res = await api.post("/auth/login", payload);
    const token = res.data?.token || "local-dev-token";
    const user =
      res.data?.user ||
      ({
        name: payload.email?.split("@")[0] || "Utilisateur",
        email: payload.email || "demo@football.ai",
      });
    localStorage.setItem("fai_token", token);
    localStorage.setItem("fai_user", JSON.stringify(user));
    setAuthState({ token, user });
  };

  const handleLogout = () => {
    localStorage.removeItem("fai_token");
    localStorage.removeItem("fai_user");
    setAuthState({ token: null, user: null });
    navigate("/login");
  };

  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(
    `Sport AI — Analyse et prediction ${activeSport}. Decouvre le tableau de bord :`
  );

  const handleSportChange = (event) => {
    const nextSport = event.target.value;
    setActiveSport(nextSport);
    localStorage.setItem("sai_active_sport", nextSport);
    setTopbarMessage(`Sport actif: ${nextSport}`);
  };

  if (!authed) {
    return (
      <div className="auth-shell">
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SAI</span>
          <div>
            <p className="brand-title">Sport AI</p>
            <p className="brand-sub">Analyse & prédiction sportive</p>
          </div>
        </div>

        <div className={`status-pill ${aiStatus}`}>
          <span className="dot" />
          IA {aiStatus === "online" ? "en ligne" : aiStatus === "offline" ? "hors ligne" : "verif"}
        </div>

        <nav className="side-nav">
          <NavLink to="/" end>
            Tableau de bord
          </NavLink>
          <NavLink to="/predictions">Prédictions</NavLink>
          <NavLink to="/matches">Matchs</NavLink>
          <NavLink to="/insights">Analyses</NavLink>
          <NavLink to="/players">Joueurs</NavLink>
          <NavLink to="/data">Données</NavLink>
          <NavLink to="/model">Laboratoire IA</NavLink>
        </nav>

        <div className="sidebar-card">
          <p>Etat IA</p>
          <strong>Modèle actif</strong>
          <span>Voir Laboratoire IA</span>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Centre de controle</p>
            <h2>Tableau de bord IA</h2>
          </div>
          <div className="topbar-actions">
            <select className="sport-select" value={activeSport} onChange={handleSportChange}>
              {sportOptions.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
            <div className="user-pill">
              <span>{authState.user?.name || "Utilisateur"}</span>
              <button className="button ghost" onClick={handleLogout}>
                Deconnexion
              </button>
            </div>
            <button className="button ghost" onClick={handleShare}>
              Partager
            </button>
            <button className="button primary" onClick={handleNewSimulation}>
              Nouvelle simulation
            </button>
            {topbarMessage ? <span className="topbar-message">{topbarMessage}</span> : null}
          </div>
        </header>

        <main>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute authed={authed}>
                  <Dashboard sport={activeSport} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/predictions"
              element={
                <ProtectedRoute authed={authed}>
                  <Predictions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches"
              element={
                <ProtectedRoute authed={authed}>
                  <Matches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <ProtectedRoute authed={authed}>
                  <Insights />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players"
              element={
                <ProtectedRoute authed={authed}>
                  <Players />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data"
              element={
                <ProtectedRoute authed={authed}>
                  <DataHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/model"
              element={
                <ProtectedRoute authed={authed}>
                  <ModelLab />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>

      {showOnboarding ? (
        <div className="onboarding">
          <div className="onboarding-card">
            <h3>Activation des services</h3>
            <p>
              L'IA est hors ligne. L'application peut afficher l'UI, mais les prédictions et
              les métriques restent indisponibles tant que le service IA ne tourne pas.
            </p>
            <ol>
              <li>Lancer le service IA (FastAPI).</li>
              <li>Vérifier que le backend tourne.</li>
            </ol>
            <div className="onboarding-actions">
              <button className="button primary" onClick={startAi} disabled={starting}>
                {starting ? "Demarrage..." : "Demarrer IA"}
              </button>
              <button className="button ghost" onClick={checkAi}>
                Réessayer
              </button>
            </div>
            <div className="onboarding-code">
              <code>cd c:\Users\adrie\football-ai\ai</code>
              <code>python -m uvicorn service:app --reload --port 8001</code>
            </div>
          </div>
        </div>
      ) : null}

      {showShare ? (
        <div className="share-modal">
          <div className="share-card">
            <div className="share-head">
              <h3>Partager ce dashboard</h3>
              <button className="button ghost" onClick={() => setShowShare(false)}>
                Fermer
              </button>
            </div>
            <p className="hint">
              Envoie le lien via ta plateforme préférée ou copie-le.
            </p>
            <div className="share-actions">
              <a
                className="button primary"
                href={`mailto:?subject=Sport AI&body=${shareText}%0A${shareUrl}`}
              >
                Email
              </a>
              <a
                className="button secondary"
                href={`https://wa.me/?text=${shareText}%0A${shareUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <a
                className="button ghost"
                href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
                target="_blank"
                rel="noreferrer"
              >
                Telegram
              </a>
              <a
                className="button secondary"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
              <a
                className="button ghost"
                href={`https://twitter.com/intent/tweet?text=${shareText}%0A${shareUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                X
              </a>
              <a
                className="button ghost"
                href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
            </div>
            <div className="share-copy">
              <input type="text" readOnly value={window.location.href} />
              <button
                className="button ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setTopbarMessage("Lien copie dans le presse-papiers.");
                  } catch (err) {
                    setTopbarMessage("Impossible de copier le lien.");
                  }
                }}
              >
                Copier
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
