const express = require("express");
const router = express.Router();

const teamProfiles = {
  "Paris FC": {
    first: ["Lucas", "Matteo", "Yanis", "Kylian", "Enzo", "Hugo", "Noah", "Theo"],
    last: ["Moreau", "Bernard", "Dupont", "Lemoine", "Martin", "Mercier", "Lefevre"],
  },
  Lyon: {
    first: ["Antoine", "Jules", "Axel", "Rayan", "Mathis", "Leo", "Nolan", "Eliott"],
    last: ["Rossi", "Garcia", "Lopez", "Duarte", "Santos", "Gomes", "Silva"],
  },
  Marseille: {
    first: ["Ibrahim", "Nabil", "Ismael", "Amine", "Karim", "Sofiane", "Adel", "Youssef"],
    last: ["Bennacer", "Diallo", "Kone", "Bamba", "Kouassi", "Traore", "Camara"],
  },
  Lille: {
    first: ["Maxime", "Adrien", "Louis", "Clement", "Thomas", "Romain", "Julien", "Kevin"],
    last: ["Leroy", "Petit", "Durand", "Morel", "Fournier", "Girard", "Andre"],
  },
  Monaco: {
    first: ["Nicolas", "Benjamin", "Alex", "Samuel", "Victor", "Arthur", "Evan", "Liam"],
    last: ["Ribeiro", "Costa", "Almeida", "Fernandes", "Carvalho", "Pereira", "Oliveira"],
  },
  Rennes: {
    first: ["Guillaume", "Etienne", "Paul", "Mathieu", "Alexis", "Quentin", "Baptiste", "Hugo"],
    last: ["Leclerc", "Renard", "Chevalier", "Gautier", "Colin", "Roussel", "Masson"],
  },
  Nice: {
    first: ["Marco", "Gianni", "Alessio", "Luca", "Sandro", "Riccardo", "Dario", "Pietro"],
    last: ["Rossi", "Bianchi", "Romano", "Greco", "Conti", "Lombardi", "Ricci"],
  },
  Lens: {
    first: ["Ethan", "Oscar", "Logan", "James", "Owen", "Nathan", "Mason", "Caleb"],
    last: ["Smith", "Taylor", "Walker", "Clark", "Wright", "Hill", "Green"],
  },
  Nantes: {
    first: ["Dylan", "Jordan", "Killian", "Ryan", "Mehdi", "Sami", "Rayan", "Anis"],
    last: ["Diallo", "Keita", "Soumare", "Camara", "Diop", "Ba", "Sow"],
  },
  Strasbourg: {
    first: ["Julian", "Felix", "Emil", "Timo", "Lukas", "Noel", "Jonas", "Max"],
    last: ["Schmidt", "Muller", "Weber", "Fischer", "Koch", "Bauer", "Zimmer"],
  },
};

const positions = ["GK", "DF", "MF", "FW"];

const makeName = (team, seed) => {
  const profile = teamProfiles[team];
  const first = profile.first[seed % profile.first.length];
  const last = profile.last[(seed * 3) % profile.last.length];
  return `${first} ${last}`;
};

const buildPlayers = () => {
  const players = [];
  Object.keys(teamProfiles).forEach((team, tIdx) => {
    for (let i = 1; i <= 22; i += 1) {
      const seed = i + tIdx * 7;
      const position = positions[Math.floor(seed % positions.length)];
      const minutes = 900 + ((i * 37 + tIdx * 11) % 900);
      const goals = position === "FW" ? seed % 12 : seed % 4;
      const assists = position === "MF" ? seed % 10 : seed % 5;
      const shots = goals * 6 + ((i * 3) % 10);
      const xg = Number((goals * 0.6 + shots * 0.05).toFixed(2));
      const form = Number(((goals + assists + xg) / 10).toFixed(2));

      players.push({
        id: `${team}-${i}`,
        team,
        name: makeName(team, seed + i),
        position,
        minutes,
        goals,
        assists,
        shots,
        xg,
        form,
      });
    }
  });
  return players;
};

router.get("/", (_req, res) => {
  const players = buildPlayers();
  res.json(players);
});

module.exports = router;
