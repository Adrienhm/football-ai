const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { spawnSync } = require("child_process");
const connectDB = require("./config/db");
const Match = require("./models/Match");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

const ensureStatsbombCsv = () => {
  const csvPath = path.join(__dirname, "..", "..", "ai", "data", "matches.csv");
  if (fs.existsSync(csvPath)) {
    return csvPath;
  }

  try {
    const aiDir = path.join(__dirname, "..", "..", "ai");
    const result = spawnSync("python", ["ingest_statsbomb.py"], {
      cwd: aiDir,
      stdio: "inherit",
    });
    if (result.status === 0 && fs.existsSync(csvPath)) {
      return csvPath;
    }
  } catch (error) {
    console.warn("StatsBomb ingest failed", error.message);
  }

  return null;
};

const seedMatches = async () => {
  if (Match.db?.readyState !== 1) {
    return;
  }

  const count = await Match.countDocuments();
  if (count > 0) {
    return;
  }

  try {
    const statsbombPath = ensureStatsbombCsv();
    if (statsbombPath && fs.existsSync(statsbombPath)) {
      const csv = fs.readFileSync(statsbombPath, "utf-8");
      const lines = csv.split("\n").filter(Boolean);
      const rows = lines.slice(1).map((line) => line.split(","));
      const data = rows.map((r) => ({
        teamA: r[1],
        teamB: r[2],
        scoreA: Number(r[14]) || 0,
        scoreB: Number(r[15]) || 0,
        date: r[0],
      }));
      if (data.length) {
        await Match.insertMany(data);
        console.log(`Seeded ${data.length} matches from StatsBomb CSV.`);
        return;
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
};

setTimeout(seedMatches, 1000);

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
