const express = require("express");
const { normalizeSport, SPORT_VALUES } = require("../constants/sports");

const router = express.Router();

const profilesBySport = {
  football: {
    positions: ["GK", "DF", "MF", "FW"],
    teams: {
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
    },
  },
  basketball: {
    positions: ["PG", "SG", "SF", "PF", "C"],
    teams: {
      Raptors: {
        first: ["Jalen", "Devin", "Tyrese", "Caleb", "Marcus", "Jordy", "Avery", "Noel"],
        last: ["Carter", "Mitchell", "Barnes", "Brooks", "Harris", "Coleman", "Young"],
      },
      Warriors: {
        first: ["Stephen", "Klay", "Jonathan", "Andrew", "Trayce", "Chris", "Brandin", "Moses"],
        last: ["Green", "Wiggins", "Kuminga", "Moody", "Podziemski", "Payton", "Santos"],
      },
      Lakers: {
        first: ["LeBron", "Anthony", "Austin", "Dangelo", "Rui", "Gabe", "Cam", "Max"],
        last: ["James", "Davis", "Reaves", "Russell", "Hachimura", "Vincent", "Reddish"],
      },
    },
  },
  tennis: {
    positions: ["SGL"],
    teams: {
      ATP: {
        first: ["Carlos", "Jannik", "Novak", "Alexander", "Daniil", "Holger", "Casper", "Taylor"],
        last: ["Alcaraz", "Sinner", "Djokovic", "Zverev", "Medvedev", "Rune", "Ruud", "Fritz"],
      },
      WTA: {
        first: ["Iga", "Aryna", "Coco", "Elena", "Qinwen", "Jessica", "Marketa", "Ons"],
        last: ["Swiatek", "Sabalenka", "Gauff", "Rybakina", "Zheng", "Pegula", "Vondrousova", "Jabeur"],
      },
    },
  },
  rugby: {
    positions: ["PR", "HK", "LK", "BK"],
    teams: {
      Toulouse: {
        first: ["Antoine", "Romain", "Thomas", "Matthieu", "Julien", "Peato", "Cyril", "Paul"],
        last: ["Dupont", "Ntamack", "Ramos", "Jalibert", "Marchand", "Mauvaka", "Baille"],
      },
      Leinster: {
        first: ["James", "Johnny", "Josh", "Hugo", "Dan", "Jordan", "Caelan", "Garry"],
        last: ["Ryan", "Sexton", "VanDerFlier", "Keenan", "Sheehan", "Larmour", "Ringrose"],
      },
      "Sharks RFC": {
        first: ["Siya", "Lukhanyo", "Grant", "Bongi", "Makazole", "Eben", "Jasper", "Damian"],
        last: ["Kolisi", "Am", "Williams", "Mbonambi", "Mapimpi", "Etzebeth", "Wiese", "Willemse"],
      },
    },
  },
  handball: {
    positions: ["GK", "LW", "RW", "CB", "PIV"],
    teams: {
      Barcelona: {
        first: ["Dika", "Ludovic", "Aleix", "Melvyn", "Aitor", "Gonzalo", "Emil", "Blaz"],
        last: ["Mem", "Fabregas", "Gomez", "Richardson", "Ariño", "Perez", "Nielsen", "Janc"],
      },
      PSG: {
        first: ["Elohim", "Nedim", "Kamil", "Luc", "Jannick", "Mathieu", "Yahia", "Ferran"],
        last: ["Prandi", "Remili", "Syprzak", "Steins", "Green", "Grebille", "Omar", "Sole"],
      },
      Kiel: {
        first: ["Niklas", "Sander", "Eric", "Domagoj", "Rune", "Elias", "Miha", "Bjarte"],
        last: ["Landin", "Sagot", "Johansson", "Duvnjak", "Dahmke", "Ellefsen", "Zarabetz", "Myrhol"],
      },
    },
  },
};

const makeName = (profile, seed) => {
  const first = profile.first[seed % profile.first.length];
  const last = profile.last[(seed * 3) % profile.last.length];
  return `${first} ${last}`;
};

const playerCounts = {
  football: 22,
  basketball: 15,
  tennis: 40,
  rugby: 28,
  handball: 18,
};

const buildSportPlayers = (sport) => {
  const config = profilesBySport[sport] || profilesBySport.football;
  const teams = Object.keys(config.teams);
  const count = playerCounts[sport] || 18;
  const players = [];

  teams.forEach((team, tIdx) => {
    for (let i = 1; i <= count; i += 1) {
      const seed = i + tIdx * 13;
      const position = config.positions[seed % config.positions.length];
      const minutes = 500 + ((i * 41 + tIdx * 19) % 2200);

      const multiplier =
        sport === "basketball" ? 2.4 : sport === "tennis" ? 0.6 : sport === "rugby" ? 1.4 : 1;
      const goals = Math.max(0, Math.round(((seed % 12) * multiplier) / 2));
      const assists = Math.max(0, Math.round(((seed % 10) * multiplier) / 2));
      const shots = Math.max(goals + 3, goals * 3 + ((seed * 2) % 14));
      const xg = Number((goals * 0.52 + shots * 0.08).toFixed(2));
      const form = Number(Math.min(9.9, (goals + assists + xg) / 4).toFixed(2));

      players.push({
        id: `${sport}-${team}-${i}`,
        sport,
        team,
        name: makeName(config.teams[team], seed + i),
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

router.get("/", (req, res) => {
  const sport = normalizeSport(req.query.sport);
  if (req.query.sport && !sport) {
    return res.status(400).json({
      error: "Invalid sport",
      supported_sports: SPORT_VALUES,
    });
  }

  if (sport) {
    return res.json(buildSportPlayers(sport));
  }

  const allPlayers = SPORT_VALUES.flatMap((sportName) => buildSportPlayers(sportName));
  return res.json(allPlayers);
});

module.exports = router;
