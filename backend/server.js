const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { spawnSync } = require("child_process");
const connectDB = require("./config/db");
const Match = require("./models/Match");
const { SPORTS, normalizeSport } = require("./constants/sports");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

const runPython = (scriptArgs, cwd, stdio = "inherit") => {
  const candidates = [
    { command: "python", args: scriptArgs },
    { command: "py", args: ["-3", ...scriptArgs] },
    { command: "python3", args: scriptArgs },
  ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, candidate.args, { cwd, stdio });
    if (!result.error && result.status === 0) {
      return true;
    }
  }

  return false;
};

const ensureStatsbombCsv = () => {
  const csvPath = path.join(__dirname, "..", "ai", "data", "matches.csv");
  if (fs.existsSync(csvPath)) {
    return csvPath;
  }

  try {
    const aiDir = path.join(__dirname, "..", "ai");
    if (runPython(["ingest_statsbomb.py"], aiDir) && fs.existsSync(csvPath)) {
      return csvPath;
    }
  } catch (error) {
    console.warn("StatsBomb ingest failed", error.message);
  }

  return null;
};

const parseMatchesCsv = (csvText) => {
  const lines = csvText.split("\n").filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

  const read = (row, key, fallback = "") => row[idx[key]] ?? fallback;
  const readNum = (row, key) => {
    const value = Number(read(row, key, 0));
    return Number.isFinite(value) ? value : 0;
  };

  return lines.slice(1).map((line) => {
    const row = line.split(",");
    return {
      sport: SPORTS.FOOTBALL,
      teamA: read(row, "team_a", "Unknown A"),
      teamB: read(row, "team_b", "Unknown B"),
      scoreA: Math.max(0, Math.round(readNum(row, "goals_a"))),
      scoreB: Math.max(0, Math.round(readNum(row, "goals_b"))),
      date: read(row, "date", ""),
    };
  });
};

const getOutlierThreshold = (sport) => {
  const normalized = normalizeSport(sport, SPORTS.FOOTBALL) || SPORTS.FOOTBALL;
  switch (normalized) {
    case SPORTS.BASKETBALL:
      return 220;
    case SPORTS.TENNIS:
      return 7;
    case SPORTS.RUGBY:
      return 90;
    case SPORTS.HANDBALL:
      return 80;
    case SPORTS.FOOTBALL:
    default:
      return 15;
  }
};

const isOutlierScore = (match) => {
  const threshold = getOutlierThreshold(match.sport);
  return (Number(match.scoreA) || 0) > threshold || (Number(match.scoreB) || 0) > threshold;
};

const hasUnrealisticData = async () => {
  const sample = await Match.find().limit(200);
  if (!sample.length) return false;
  const outliers = sample.filter(isOutlierScore).length;
  return outliers / sample.length >= 0.05;
};

const seedMatches = async () => {
  if (Match.db?.readyState !== 1) {
    return false;
  }

  // Migrate legacy records created before introducing the "sport" field.
  await Match.updateMany({ sport: { $exists: false } }, { $set: { sport: SPORTS.FOOTBALL } });

  const count = await Match.countDocuments();
  if (count > 0) {
    // Auto-heal legacy bad seed where scores were read from possession columns.
    const unrealistic = await hasUnrealisticData();
    if (!unrealistic) {
      return true;
    }
    console.warn("Detected unrealistic match scores. Rebuilding matches collection.");
    await Match.deleteMany({});
  }

  try {
    const statsbombPath = ensureStatsbombCsv();
    if (statsbombPath && fs.existsSync(statsbombPath)) {
      const csv = fs.readFileSync(statsbombPath, "utf-8");
      const data = parseMatchesCsv(csv);
      if (data.length) {
        await Match.insertMany(data);
        console.log(`Seeded ${data.length} matches from StatsBomb CSV.`);
        return true;
      }
    }

    const samplePath = path.join(__dirname, "data", "sample-matches.json");
    const raw = fs.readFileSync(samplePath, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length) {
      await Match.insertMany(data);
      console.log(`Seeded ${data.length} matches from sample.`);
    }
  } catch (error) {
    console.warn("Seed failed", error.message);
  }

  return true;
};

let seedAttempts = 0;
const seedTimer = setInterval(async () => {
  seedAttempts += 1;
  const done = await seedMatches();
  if (done || seedAttempts >= 20) {
    clearInterval(seedTimer);
  }
}, 1500);

app.use("/api", require("./routes/predict.routes"));
app.use("/api/test", require("./routes/test.routes"));
app.use("/api/matches", require("./routes/match.routes"));
app.use("/api/players", require("./routes/players.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/ai", require("./routes/ai.routes"));
app.use("/api/system", require("./routes/system.routes"));
app.use("/api/report", require("./routes/report.routes"));

app.listen(5000, () => {
  console.log("Serveur backend sur http://localhost:5000");
});
