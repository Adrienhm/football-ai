const { SPORTS, normalizeSport } = require("../constants/sports");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDate = (value) => {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const pickText = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const normalizeMatchPayload = (payload = {}, fallbackSport = SPORTS.FOOTBALL) => {
  const sport = normalizeSport(payload.sport, fallbackSport) || fallbackSport;

  const teamA = pickText(payload.teamA, payload.homeTeam, payload.playerA, payload.sideA) || "Team A";
  const teamB = pickText(payload.teamB, payload.awayTeam, payload.playerB, payload.sideB) || "Team B";

  const scoreA = Math.max(0, toNumber(payload.scoreA ?? payload.homeScore ?? payload.pointsA, 0));
  const scoreB = Math.max(0, toNumber(payload.scoreB ?? payload.awayScore ?? payload.pointsB, 0));

  return {
    sport,
    teamA,
    teamB,
    scoreA,
    scoreB,
    date: toDate(payload.date),
    form: pickText(payload.form),
    risk: pickText(payload.risk),
  };
};

module.exports = {
  normalizeMatchPayload,
};
