export class KnockoutMatch {
  /**
   * @param {string} id - Unique identifier for the match (e.g., 'QF1', 'SF1', 'F')
   * @param {Object} homeTeam - Team object {id, name, flagUrl}
   * @param {Object} awayTeam - Team object
   * @param {string} round - 'quarterfinal', 'semifinal', 'final'
   */
  constructor(id, homeTeam, awayTeam, round) {
    this.id = id;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.round = round;
    this.homeGoals = null;
    this.awayGoals = null;
    this.winner = null;
  }

  setResult(homeGoals, awayGoals) {
    if (homeGoals < 0 || awayGoals < 0) {
      throw new Error('Goals must be non‑negative');
    }
    this.homeGoals = homeGoals;
    this.awayGoals = awayGoals;
    this.winner = homeGoals > awayGoals ? this.homeTeam : awayGoals > homeGoals ? this.awayTeam : null;
  }

  /** Returns the winning team object, or null if draw/not played */
  getWinner() {
    if (this.homeGoals === null || this.awayGoals === null) return null;
    if (this.homeGoals > this.awayGoals) return this.homeTeam;
    if (this.awayGoals > this.homeGoals) return this.awayTeam;
    return null;
  }
}
