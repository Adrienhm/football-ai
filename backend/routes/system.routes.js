const express = require("express");
const path = require("path");
const { spawn } = require("child_process");

const router = express.Router();

const aiDir = path.join(__dirname, "..", "..", "ai");

const uvicornArgs = ["-m", "uvicorn", "service:app", "--reload", "--port", "8001"];

const spawnDetached = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      detached: true,
      stdio: "ignore",
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });

router.post("/start-ai", async (_req, res) => {
  const candidates = [
    { command: "python", args: uvicornArgs },
    { command: "py", args: ["-3", ...uvicornArgs] },
    { command: "python3", args: uvicornArgs },
  ];

  let lastError = null;

  for (const candidate of candidates) {
    try {
      await spawnDetached(candidate.command, candidate.args, aiDir);
      return res.json({ status: "starting", launcher: candidate.command });
    } catch (error) {
      lastError = error;
    }
  }

  return res.status(500).json({
    error: "Failed to start AI service",
    details: lastError?.message || "No Python launcher found",
    hint: "Install Python and ensure python/py is available in PATH.",
  });
});

module.exports = router;
