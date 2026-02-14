const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const { normalizeSport, SPORT_VALUES } = require("../constants/sports");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";

const readSport = (req) => {
  const fromQuery = req.query?.sport;
  const fromBody = req.body?.sport;
  const sport = normalizeSport(fromQuery || fromBody);
  if ((fromQuery || fromBody) && !sport) {
    return { error: true };
  }
  return { sport: sport || "football" };
};

router.get("/health", async (_req, res) => {
  try {
    const { sport, error } = readSport(_req);
    if (error) {
      return res.status(400).json({ error: "Invalid sport", supported_sports: SPORT_VALUES });
    }
    const response = await axios.get(`${AI_URL}/health`, {
      timeout: 4000,
      params: { sport },
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ error: "AI service unavailable" });
  }
});

router.get("/metrics", async (_req, res) => {
  try {
    const { sport, error } = readSport(_req);
    if (error) {
      return res.status(400).json({ error: "Invalid sport", supported_sports: SPORT_VALUES });
    }
    const response = await axios.get(`${AI_URL}/metrics`, {
      timeout: 4000,
      params: { sport },
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ error: "AI service unavailable" });
  }
});

router.get("/metrics/compare", async (_req, res) => {
  try {
    const { sport, error } = readSport(_req);
    if (error) {
      return res.status(400).json({ error: "Invalid sport", supported_sports: SPORT_VALUES });
    }
    const response = await axios.get(`${AI_URL}/metrics/compare`, {
      timeout: 4000,
      params: { sport },
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ error: "AI service unavailable" });
  }
});

router.get("/model/active", async (_req, res) => {
  try {
    const { sport, error } = readSport(_req);
    if (error) {
      return res.status(400).json({ error: "Invalid sport", supported_sports: SPORT_VALUES });
    }
    const response = await axios.get(`${AI_URL}/model/active`, {
      timeout: 4000,
      params: { sport },
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ error: "AI service unavailable" });
  }
});

router.post("/model/select", async (req, res) => {
  try {
    const { sport, error } = readSport(req);
    if (error) {
      return res.status(400).json({ error: "Invalid sport", supported_sports: SPORT_VALUES });
    }
    const response = await axios.post(
      `${AI_URL}/model/select`,
      { ...req.body, sport },
      { timeout: 4000 }
    );
    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ error: "AI service unavailable" });
  }
});

router.post("/train", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const { sport, error } = readSport(req);
    if (error) {
      return res.status(400).json({ error: "Invalid sport", supported_sports: SPORT_VALUES });
    }

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname || "dataset.csv",
      contentType: req.file.mimetype,
    });

    if (req.body?.algo) {
      form.append("algo", req.body.algo);
    }
    form.append("sport", sport);

    const response = await axios.post(`${AI_URL}/train`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 15000,
    });

    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ error: "AI training failed", details: error.message });
  }
});

router.post("/train/refresh", async (req, res) => {
  try {
    const { sport, error } = readSport(req);
    if (error) {
      return res.status(400).json({ error: "Invalid sport", supported_sports: SPORT_VALUES });
    }

    const form = new FormData();
    form.append("algo", req.body?.algo || "logistic");
    form.append("sport", sport);

    const response = await axios.post(`${AI_URL}/train/refresh`, form, {
      headers: form.getHeaders(),
      timeout: 15000,
    });

    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ error: "AI refresh failed", details: error.message });
  }
});

router.post("/train/compare", async (_req, res) => {
  try {
    const { sport, error } = readSport(_req);
    if (error) {
      return res.status(400).json({ error: "Invalid sport", supported_sports: SPORT_VALUES });
    }

    const form = new FormData();
    form.append("sport", sport);

    const response = await axios.post(`${AI_URL}/train/compare`, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ error: "AI compare failed", details: error.message });
  }
});

router.post("/ingest/statsbomb", async (req, res) => {
  try {
    const { sport, error } = readSport(req);
    if (error) {
      return res.status(400).json({ error: "Invalid sport", supported_sports: SPORT_VALUES });
    }
    const payload = {
      sport,
      competitionId: req.body?.competitionId ?? null,
      seasonId: req.body?.seasonId ?? null,
    };
    const response = await axios.post(`${AI_URL}/ingest/statsbomb`, payload, {
      timeout: 20000,
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(502).json({ error: "StatsBomb ingestion failed", details: error.message });
  }
});

module.exports = router;
