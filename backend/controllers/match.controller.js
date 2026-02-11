const fs = require("fs");
const path = require("path");
const Match = require("../models/Match");

const samplePath = path.join(__dirname, "..", "data", "sample-matches.json");

const loadSample = () => {
  try {
    const raw = fs.readFileSync(samplePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
};

exports.createMatch = async (req, res) => {
  try {
    const match = await Match.create(req.body);
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: "Failed to create match" });
  }
};

exports.getMatches = async (req, res) => {
  const isDbReady = Match.db?.readyState === 1;

  if (!isDbReady) {
    return res.json(loadSample());
  }

  try {
    const matches = await Match.find().sort({ date: -1 }).limit(50);
    if (!matches.length) {
      return res.json(loadSample());
    }
    return res.json(matches);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch matches" });
  }
};
