import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!email || !password) {
        throw new Error("Email et mot de passe requis.");
      }
      await onLogin({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">SAI</span>
        <div>
          <h1>Sport AI</h1>
          <p>Analyse et prédiction sportive</p>
        </div>
      </div>
      <h2>Connexion</h2>
      <p className="hint">
        Accède au dashboard IA. Utilise n'importe quel email et mot de passe en mode demo.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@club.com"
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </label>
        {error ? <div className="auth-error">{error}</div> : null}
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

export default Login;
