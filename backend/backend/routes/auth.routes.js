const express = require("express");
const router = express.Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }

  const name = String(email).split("@")[0] || "Utilisateur";
  return res.json({
    message: "Login OK",
    token: `demo-${Date.now()}`,
    user: {
      name,
      email,
    },
  });
});

module.exports = router;
