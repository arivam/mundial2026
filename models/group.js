export class Group {
  constructor(name, teams = []) {
    this.name = name;
    this.teams = teams; // array of Team instances
    this.matches = [];
  }

  addMatch(match) {
    this.matches.push(match);
  }

  // Compute standings for this group
  getStandings() {
    const stats = {};
    this.teams.forEach(team => {
      stats[team.id] = {
        team,
        pj: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      };
    });
    this.matches.forEach(match => {
      if (!match.isPlayed()) return;
      const home = stats[match.homeTeam.id];
      const away = stats[match.awayTeam.id];
      const hg = match.homeGoals;
      const ag = match.awayGoals;
      home.pj += 1;
      away.pj += 1;
      home.gf += hg;
      home.ga += ag;
      away.gf += ag;
      away.ga += hg;
      home.gd = home.gf - home.ga;
      away.gd = away.gf - away.ga;
      if (hg > ag) {
        home.points += 3;
      } else if (hg < ag) {
        away.points += 3;
      } else {
        home.points += 1;
        away.points += 1;
      }
    });
    const standings = Object.values(stats)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      })
      .map(s => ({
        team: s.team,
        pj: s.pj,
        gf: s.gf,
        ga: s.ga,
        gd: s.gd,
        points: s.points,
      }));
    return standings;
  }

  /**
   * Return the top N qualified teams according to the same tie‑break rules.
   * @param {number} count - Number of teams to return (default 2).
   */
  getQualifiedTeams(count = 2) {
    const standings = this.getStandings();
    return standings.slice(0, count).map(s => s.team);
  }
}
