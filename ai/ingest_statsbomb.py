from __future__ import annotations

import csv
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import requests

COMPETITIONS_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data/competitions.json"
MATCHES_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data/matches/{competition_id}/{season_id}.json"


@dataclass
class TeamStats:
    matches: int = 0
    goals_for: int = 0
    goals_against: int = 0
    points: int = 0

    def strength(self) -> float:
        if self.matches == 0:
            return 70.0
        return 60 + (self.points / self.matches) * 10 + (self.goal_diff() * 1.5)

    def form(self) -> float:
        if self.matches == 0:
            return 0.6
        return min(1.0, max(0.3, self.points / (self.matches * 3)))

    def goal_diff(self) -> int:
        return self.goals_for - self.goals_against


@dataclass
class DatasetRow:
    date: str
    team_a: str
    team_b: str
    strength_a: float
    strength_b: float
    form_a: float
    form_b: float
    xg_a: float
    xg_b: float
    injuries_a: int
    injuries_b: int
    shots_a: int
    shots_b: int
    poss_a: float
    poss_b: float
    goals_a: int
    goals_b: int

    def to_dict(self) -> Dict[str, object]:
        return {
            "date": self.date,
            "team_a": self.team_a,
            "team_b": self.team_b,
            "strength_a": round(self.strength_a, 2),
            "strength_b": round(self.strength_b, 2),
            "form_a": round(self.form_a, 2),
            "form_b": round(self.form_b, 2),
            "xg_a": round(self.xg_a, 2),
            "xg_b": round(self.xg_b, 2),
            "injuries_a": self.injuries_a,
            "injuries_b": self.injuries_b,
            "shots_a": self.shots_a,
            "shots_b": self.shots_b,
            "poss_a": round(self.poss_a, 1),
            "poss_b": round(self.poss_b, 1),
            "goals_a": self.goals_a,
            "goals_b": self.goals_b,
        }


def fetch_json(url: str) -> list:
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    return response.json()


def list_competitions() -> list:
    return fetch_json(COMPETITIONS_URL)


def load_matches(competition_id: int, season_id: int) -> list:
    url = MATCHES_URL.format(competition_id=competition_id, season_id=season_id)
    return fetch_json(url)


def build_dataset(matches: list) -> List[DatasetRow]:
    stats: Dict[str, TeamStats] = {}
    rows: List[DatasetRow] = []

    def ensure(team: str) -> TeamStats:
        if team not in stats:
            stats[team] = TeamStats()
        return stats[team]

    for match in matches:
        home = match["home_team"]["home_team_name"]
        away = match["away_team"]["away_team_name"]
        date = match.get("match_date") or match.get("kick_off") or "unknown"
        goals_a = int(match.get("home_score") or 0)
        goals_b = int(match.get("away_score") or 0)

        home_stats = ensure(home)
        away_stats = ensure(away)

        strength_a = home_stats.strength()
        strength_b = away_stats.strength()
        form_a = home_stats.form()
        form_b = away_stats.form()

        xg_a = max(0.4, goals_a * 0.9 + 0.6)
        xg_b = max(0.4, goals_b * 0.9 + 0.6)
        shots_a = max(6, goals_a * 5 + 7)
        shots_b = max(6, goals_b * 5 + 7)
        poss_a = min(65.0, max(35.0, 50 + (strength_a - strength_b) * 0.3))
        poss_b = 100 - poss_a

        row = DatasetRow(
            date=date,
            team_a=home,
            team_b=away,
            strength_a=strength_a,
            strength_b=strength_b,
            form_a=form_a,
            form_b=form_b,
            xg_a=xg_a,
            xg_b=xg_b,
            injuries_a=1,
            injuries_b=1,
            shots_a=shots_a,
            shots_b=shots_b,
            poss_a=poss_a,
            poss_b=poss_b,
            goals_a=goals_a,
            goals_b=goals_b,
        )
        rows.append(row)

        # Update stats after match
        home_stats.matches += 1
        away_stats.matches += 1
        home_stats.goals_for += goals_a
        home_stats.goals_against += goals_b
        away_stats.goals_for += goals_b
        away_stats.goals_against += goals_a

        if goals_a > goals_b:
            home_stats.points += 3
        elif goals_b > goals_a:
            away_stats.points += 3
        else:
            home_stats.points += 1
            away_stats.points += 1

    return rows


def save_csv(rows: Iterable[DatasetRow], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=DatasetRow.__annotations__.keys())
        writer.writeheader()
        for row in rows:
            writer.writerow(row.to_dict())


def ingest_statsbomb(
    output_path: Path,
    competition_id: Optional[int] = None,
    season_id: Optional[int] = None,
) -> Tuple[Path, int, int, int]:
    competitions = list_competitions()
    if not competitions:
        raise RuntimeError("No competitions found")

    if competition_id is None or season_id is None:
        first = competitions[0]
        competition_id = int(first["competition_id"])
        season_id = int(first["season_id"])

    matches = load_matches(competition_id, season_id)
    rows = build_dataset(matches)
    save_csv(rows, output_path)

    return output_path, competition_id, season_id, len(rows)


if __name__ == "__main__":
    out = Path(__file__).parent / "data" / "matches.csv"
    path, comp, season, count = ingest_statsbomb(out)
    print(f"Saved {count} rows to {path} (competition {comp}, season {season})")
