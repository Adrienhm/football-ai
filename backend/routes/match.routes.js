const express = require("express");
const router = express.Router();
const {
  createMatch,
  getMatches,
  getMatchStats,
  getSupportedSports,
} = require("../controllers/match.controller");

router.post("/", createMatch);
router.get("/", getMatches);
router.get("/sports", getSupportedSports);
router.get("/stats", getMatchStats);

module.exports = router;
