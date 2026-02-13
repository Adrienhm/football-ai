const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  teamA: String,
  teamB: String,
  scoreA: Number,
  scoreB: Number,
  date: Date,
});

module.exports = mongoose.model("Match", matchSchema);
