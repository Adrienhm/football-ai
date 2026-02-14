const fs = require("fs");
const path = require("path");
const Match = require("../models/Match");
const { SPORT_VALUES, normalizeSport } = require("../constants/sports");
const { normalizeMatchPayload } = require("../services/matchNormalization");
const { computeStatsForSport } = require("../services/statsPipelines");

const samplePath = path.join(__dirname, "..", "data", "sample-matches.json");

const loadSample = () => {
  try {
    const raw = fs.readFileSync(samplePath, "utf-8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map((item) => normalizeMatchPayload(item));
  } catch (err) {
    return [];
  }
};

const filterBySport = (matches, sport) => {
  if (!sport) return matches;
  return matches.filter((m) => normalizeSport(m.sport) === sport);
};

exports.createMatch = async (req, res) => {
  try {
    const match = await Match.create(normalizeMatchPayload(req.body));
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: "Failed to create match" });
  }
};

exports.getMatches = async (req, res) => {
  const sport = req.query.sport ? normalizeSport(req.query.sport) : null;
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 50));

  if (req.query.sport && !sport) {
    return res.status(400).json({
      error: "Invalid sport",
      supported_sports: SPORT_VALUES,
    });
  }

  const isDbReady = Match.db?.readyState === 1;

  if (!isDbReady) {
    return res.json(filterBySport(loadSample(), sport));
  }

  try {
    const query = sport ? { sport } : {};
    const matches = await Match.find(query).sort({ date: -1 }).limit(limit);
    if (!matches.length) {
      return res.json(filterBySport(loadSample(), sport));
    }
    return res.json(matches);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch matches" });
  }
};

exports.getSupportedSports = (_req, res) => {
  return res.json({ sports: SPORT_VALUES });
};

exports.getMatchStats = async (req, res) => {
  const sport = req.query.sport ? normalizeSport(req.query.sport) : null;
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 300));

  if (req.query.sport && !sport) {
    return res.status(400).json({
      error: "Invalid sport",
      supported_sports: SPORT_VALUES,
    });
  }

  try {
    const isDbReady = Match.db?.readyState === 1;
    const query = sport ? { sport } : {};
    const matches = isDbReady
      ? await Match.find(query).sort({ date: -1 }).limit(limit)
      : filterBySport(loadSample(), sport);

    const source = matches.length ? matches : filterBySport(loadSample(), sport);

    if (sport) {
      return res.json({
        ...computeStatsForSport(sport, source),
        sample_size: source.length,
      });
    }

    const bySport = {};
    for (const sportName of SPORT_VALUES) {
      const subset = source.filter((m) => normalizeSport(m.sport) === sportName);
      bySport[sportName] = computeStatsForSport(sportName, subset);
    }

    return res.json({
      mode: "all_sports",
      sample_size: source.length,
      by_sport: bySport,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to compute match stats" });
  }
};
