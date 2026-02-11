const fs = require("fs");
const path = require("path");
const express = require("express");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const Match = require("../models/Match");

const router = express.Router();
const samplePath = path.join(__dirname, "..", "data", "sample-matches.json");

const loadSample = () => {
  try {
    const raw = fs.readFileSync(samplePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
};

const fetchMatches = async () => {
  const isDbReady = Match.db?.readyState === 1;
  if (!isDbReady) {
    return loadSample();
  }
  return Match.find().sort({ date: -1 }).limit(50);
};

const buildStats = (matches) => {
  if (!matches.length) {
    return { total: 0, avgGoals: 0, homeWinRate: 0, volatility: 0 };
  }
  const totalGoals = matches.reduce(
    (sum, m) => sum + (Number(m.scoreA) || 0) + (Number(m.scoreB) || 0),
    0
  );
  const homeWins = matches.filter((m) => Number(m.scoreA) > Number(m.scoreB)).length;
  const draws = matches.filter((m) => Number(m.scoreA) === Number(m.scoreB)).length;
  return {
    total: matches.length,
    avgGoals: (totalGoals / matches.length).toFixed(2),
    homeWinRate: ((homeWins / matches.length) * 100).toFixed(1),
    volatility: ((draws / matches.length) * 100).toFixed(1),
  };
};

const buildSummary = (stats) => {
  const avg = Number(stats.avgGoals || 0);
  const home = Number(stats.homeWinRate || 0);
  const draw = Number(stats.volatility || 0);

  const goalsTone = avg >= 2.6 ? "offensif" : avg <= 1.8 ? "ferme" : "equilibre";
  const homeTone = home >= 55 ? "fort" : home <= 40 ? "faible" : "modere";
  const drawTone = draw >= 30 ? "eleve" : "normal";

  return (
    `Le championnat montre un profil ${goalsTone} avec ${avg} buts/match. ` +
    `L'avantage domicile est ${homeTone} (${home}%). ` +
    `Le taux de nuls est ${drawTone} (${draw}%).`
  );
};

router.get("/csv", async (_req, res) => {
  try {
    const matches = await fetchMatches();
    const header = ["teamA", "scoreA", "scoreB", "teamB", "form", "risk", "date"];
    const rows = matches.map((m) => [
      m.teamA,
      m.scoreA,
      m.scoreB,
      m.teamB,
      m.form || "",
      m.risk || "",
      m.date || "",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=football-ai-matches.csv");
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: "CSV export failed" });
  }
});

router.get("/pdf", async (_req, res) => {
  try {
    const matches = await fetchMatches();
    const stats = buildStats(matches);
    const summary = buildSummary(stats);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const accent = rgb(0.29, 0.89, 0.44);
    const muted = rgb(0.7, 0.75, 0.75);
    const dark = rgb(0.1, 0.12, 0.12);

    page.drawRectangle({ x: 0, y: height - 120, width: 595, height: 120, color: dark });
    page.drawText("Football AI - Rapport de performance", {
      x: 40,
      y: height - 60,
      size: 20,
      font: fontBold,
      color: accent,
    });
    page.drawText(`Genere le: ${new Date().toLocaleString("fr-FR")}`, {
      x: 40,
      y: height - 85,
      size: 10,
      font,
      color: muted,
    });

    let y = height - 150;
    page.drawText("Synthese IA", { x: 40, y, size: 12, font: fontBold });
    y -= 16;
    page.drawText(summary, { x: 40, y, size: 10, font, color: muted, maxWidth: 520 });

    y -= 40;
    page.drawText("Indicateurs cle", { x: 40, y, size: 12, font: fontBold });
    y -= 18;

    const cards = [
      { label: "Matchs analyses", value: stats.total },
      { label: "Moyenne de buts", value: stats.avgGoals },
      { label: "Victoire domicile", value: `${stats.homeWinRate}%` },
      { label: "Volatilite (nuls)", value: `${stats.volatility}%` },
    ];

    cards.forEach((card, idx) => {
      const x = 40 + (idx % 2) * 260;
      const row = Math.floor(idx / 2);
      const yPos = y - row * 60;
      page.drawRectangle({ x, y: yPos - 30, width: 240, height: 48, color: rgb(0.12, 0.15, 0.14) });
      page.drawText(card.label, { x: x + 12, y: yPos + 6, size: 9, font, color: muted });
      page.drawText(String(card.value), { x: x + 12, y: yPos - 10, size: 14, font: fontBold, color: accent });
    });

    y -= 140;
    page.drawText("Graphique - Moyenne de buts", { x: 40, y, size: 12, font: fontBold });
    y -= 12;
    const barX = 40;
    const barY = y - 60;
    const barWidth = 260;
    const barHeight = 12;
    const maxAvg = 4;
    const fillWidth = Math.min(barWidth, (Number(stats.avgGoals) / maxAvg) * barWidth);
    page.drawRectangle({ x: barX, y: barY, width: barWidth, height: barHeight, color: rgb(0.18, 0.22, 0.2) });
    page.drawRectangle({ x: barX, y: barY, width: fillWidth, height: barHeight, color: accent });
    page.drawText(`${stats.avgGoals} buts/match`, { x: barX, y: barY + 18, size: 9, font, color: muted });

    y -= 100;
    page.drawText("Derniers matchs", { x: 40, y, size: 12, font: fontBold });
    y -= 16;

    const rows = matches.slice(0, 10);
    if (!rows.length) {
      page.drawText("Aucun match disponible.", { x: 40, y, size: 10, font, color: muted });
    } else {
      rows.forEach((m) => {
        const line = `${m.teamA} ${m.scoreA} - ${m.scoreB} ${m.teamB} (${m.date || "date inconnue"})`;
        page.drawText(line, { x: 40, y, size: 10, font });
        y -= 14;
      });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=football-ai-rapport.pdf");
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    return res.status(500).json({ error: "Report generation failed" });
  }
});

module.exports = router;
