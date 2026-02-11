const express = require("express");
const path = require("path");
const { spawn } = require("child_process");

const router = express.Router();

const aiDir = path.join(__dirname, "..", "..", "..", "ai");

const startProcess = (command, args, cwd) => {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
};

router.post("/start-ai", (_req, res) => {
  try {
    startProcess("python", ["-m", "uvicorn", "service:app", "--reload", "--port", "8001"], aiDir);
    return res.json({ status: "starting" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to start AI service" });
  }
});

module.exports = router;
