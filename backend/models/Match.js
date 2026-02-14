const mongoose = require("mongoose");
const { SPORTS, SPORT_VALUES } = require("../constants/sports");

const matchSchema = new mongoose.Schema({
  sport: {
    type: String,
    enum: SPORT_VALUES,
    default: SPORTS.FOOTBALL,
    index: true,
  },
  teamA: { type: String, required: true, trim: true },
  teamB: { type: String, required: true, trim: true },
  scoreA: { type: Number, default: 0, min: 0 },
  scoreB: { type: Number, default: 0, min: 0 },
  form: { type: String, default: "" },
  risk: { type: String, default: "" },
  date: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("Match", matchSchema);
