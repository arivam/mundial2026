// models/match.js
// Match model representing a single fixture between two teams

export class Match {
  /**
   * @param {string} id - Unique identifier for the match
   * @param {object} homeTeam - Team instance representing the home side
   * @param {object} awayTeam - Team instance representing the away side
   * @param {string} date - ISO date string for the match
   * @param {number} homeGoals - Goals scored by home team (default 0)
   * @param {number} awayGoals - Goals scored by away team (default 0)
   */
  constructor(id, homeTeam, awayTeam, date, homeGoals = 0, awayGoals = 0) {
    this.id = id;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.date = date;
    this.homeGoals = homeGoals;
    this.awayGoals = awayGoals;
  }

  /** Update the result of the match */
  setResult(homeGoals, awayGoals) {
    this.homeGoals = homeGoals;
    this.awayGoals = awayGoals;
  }
}

export default Match;
