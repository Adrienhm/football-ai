const express = require("express");
const axios = require("axios");
const { normalizeSport, SPORT_VALUES } = require("../constants/sports");

const router = express.Router();

const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";

router.post("/predict", async (req, res) => {
  const sport = normalizeSport(req.body?.sport);
  if (req.body?.sport && !sport) {
    return res.status(400).json({
      error: "Invalid sport",
      supported_sports: SPORT_VALUES,
    });
  }

  try {
    const payload = {
      sport: sport || "football",
      strengthA: Number(req.body.strengthA ?? 75),
      strengthB: Number(req.body.strengthB ?? 70),
      formA: Number(req.body.formA ?? 0.65),
      formB: Number(req.body.formB ?? 0.62),
      xgA: Number(req.body.xgA ?? 1.7),
      xgB: Number(req.body.xgB ?? 1.5),
      injuriesA: Number(req.body.injuriesA ?? 1),
      injuriesB: Number(req.body.injuriesB ?? 1),
      shotsA: Number(req.body.shotsA ?? 14),
      shotsB: Number(req.body.shotsB ?? 12),
      possessionA: Number(req.body.possessionA ?? 52),
      possessionB: Number(req.body.possessionB ?? 48),
      matchId: req.body.matchId ?? null,
    };

    const response = await axios.post(`${AI_URL}/predict`, payload, {
      timeout: 5000,
    });

    return res.json({
      ...response.data,
      source: "ai-service",
    });
  } catch (error) {
    return res.status(502).json({
      error: "AI service unavailable",
      details: error.message,
    });
  }
});

module.exports = router;
