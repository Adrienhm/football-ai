const { SPORTS, SPORT_VALUES } = require("../constants/sports");

const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));

const sanitizeMatches = (matches = []) =>
  matches.map((match) => ({
    sport: match.sport || SPORTS.FOOTBALL,
    scoreA: Math.max(0, Number(match.scoreA) || 0),
    scoreB: Math.max(0, Number(match.scoreB) || 0),
  }));

const baseStats = (matches) => {
  const total = matches.length;
  if (!total) {
    return {
      total_matches: 0,
      avg_score_a: 0,
      avg_score_b: 0,
      avg_total_score: 0,
      home_win_rate: 0,
      away_win_rate: 0,
      draw_rate: 0,
    };
  }

  const totalScoreA = matches.reduce((sum, m) => sum + m.scoreA, 0);
  const totalScoreB = matches.reduce((sum, m) => sum + m.scoreB, 0);
  const homeWins = matches.filter((m) => m.scoreA > m.scoreB).length;
  const awayWins = matches.filter((m) => m.scoreB > m.scoreA).length;
  const draws = total - homeWins - awayWins;

  return {
    total_matches: total,
    avg_score_a: round(totalScoreA / total),
    avg_score_b: round(totalScoreB / total),
    avg_total_score: round((totalScoreA + totalScoreB) / total),
    home_win_rate: round((homeWins / total) * 100),
    away_win_rate: round((awayWins / total) * 100),
    draw_rate: round((draws / total) * 100),
  };
};

const footballPipeline = (matches) => {
  const stats = baseStats(matches);
  if (!matches.length) return stats;

  const cleanSheets = matches.filter((m) => m.scoreA === 0 || m.scoreB === 0).length;
  const btts = matches.filter((m) => m.scoreA > 0 && m.scoreB > 0).length;
  const over25 = matches.filter((m) => m.scoreA + m.scoreB >= 3).length;

  return {
    ...stats,
    avg_goals_per_match: stats.avg_total_score,
    clean_sheet_rate: round((cleanSheets / matches.length) * 100),
    both_teams_scored_rate: round((btts / matches.length) * 100),
    over_2_5_goals_rate: round((over25 / matches.length) * 100),
  };
};

const basketballPipeline = (matches) => {
  const stats = baseStats(matches);
  if (!matches.length) return stats;

  const highScoring = matches.filter((m) => m.scoreA + m.scoreB >= 200).length;
  const closeGames = matches.filter((m) => Math.abs(m.scoreA - m.scoreB) <= 5).length;

  return {
    ...stats,
    avg_points_per_game: stats.avg_total_score,
    high_scoring_games_rate: round((highScoring / matches.length) * 100),
    close_games_rate: round((closeGames / matches.length) * 100),
  };
};

const tennisPipeline = (matches) => {
  const stats = baseStats(matches);
  if (!matches.length) return stats;

  const straight = matches.filter(
    (m) => (m.scoreA === 2 && m.scoreB === 0) || (m.scoreA === 0 && m.scoreB === 2)
  ).length;
  const longMatches = matches.filter((m) => m.scoreA + m.scoreB >= 3).length;

  return {
    ...stats,
    avg_sets_per_match: stats.avg_total_score,
    straight_sets_rate: round((straight / matches.length) * 100),
    deciding_set_rate: round((longMatches / matches.length) * 100),
    draw_rate: 0,
  };
};

const rugbyPipeline = (matches) => {
  const stats = baseStats(matches);
  if (!matches.length) return stats;

  const highScoring = matches.filter((m) => m.scoreA + m.scoreB >= 50).length;
  const avgTries = matches.reduce((sum, m) => sum + (m.scoreA + m.scoreB) / 5, 0) / matches.length;

  return {
    ...stats,
    avg_points_per_match: stats.avg_total_score,
    avg_estimated_tries: round(avgTries),
    high_scoring_games_rate: round((highScoring / matches.length) * 100),
  };
};

const handballPipeline = (matches) => {
  const stats = baseStats(matches);
  if (!matches.length) return stats;

  const highScoring = matches.filter((m) => m.scoreA + m.scoreB >= 55).length;
  const closeGames = matches.filter((m) => Math.abs(m.scoreA - m.scoreB) <= 3).length;

  return {
    ...stats,
    avg_goals_per_match: stats.avg_total_score,
    high_scoring_games_rate: round((highScoring / matches.length) * 100),
    close_games_rate: round((closeGames / matches.length) * 100),
  };
};

const PIPELINE_BY_SPORT = {
  [SPORTS.FOOTBALL]: footballPipeline,
  [SPORTS.BASKETBALL]: basketballPipeline,
  [SPORTS.TENNIS]: tennisPipeline,
  [SPORTS.RUGBY]: rugbyPipeline,
  [SPORTS.HANDBALL]: handballPipeline,
};

const computeStatsForSport = (sport, matches = []) => {
  const safeSport = SPORT_VALUES.includes(sport) ? sport : SPORTS.FOOTBALL;
  const pipeline = PIPELINE_BY_SPORT[safeSport] || footballPipeline;
  const normalized = sanitizeMatches(matches);
  return {
    sport: safeSport,
    pipeline: `${safeSport}_pipeline`,
    metrics: pipeline(normalized),
  };
};

module.exports = {
  computeStatsForSport,
};
