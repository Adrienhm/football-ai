const SPORTS = Object.freeze({
  FOOTBALL: "football",
  BASKETBALL: "basketball",
  TENNIS: "tennis",
  RUGBY: "rugby",
  HANDBALL: "handball",
});

const SPORT_VALUES = Object.freeze(Object.values(SPORTS));

const SPORT_LABELS = Object.freeze({
  [SPORTS.FOOTBALL]: "Football",
  [SPORTS.BASKETBALL]: "Basketball",
  [SPORTS.TENNIS]: "Tennis",
  [SPORTS.RUGBY]: "Rugby",
  [SPORTS.HANDBALL]: "Handball",
});

const normalizeSport = (sport, fallback = SPORTS.FOOTBALL) => {
  if (!sport) return fallback;
  const normalized = String(sport).trim().toLowerCase();
  return SPORT_VALUES.includes(normalized) ? normalized : null;
};

module.exports = {
  SPORTS,
  SPORT_VALUES,
  SPORT_LABELS,
  normalizeSport,
};
