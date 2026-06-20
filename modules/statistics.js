// modules/statistics.js
// Service that aggregates data for the statistics page.
// Depends on GroupService, KnockoutService, UserService (optional) and BetService (optional).

export class StatisticsService {
  constructor() {
    this.groupService = null;
    this.knockoutService = null;
    this.userService = null;
    this.betService = null;
  }

  /**
   * Set dependent services after they are instantiated.
   * @param {Object} deps
   */
  setDependencies({ groupService, knockoutService, userService, betService }) {
    this.groupService = groupService;
    this.knockoutService = knockoutService;
    this.userService = userService;
    this.betService = betService;
  }

  /**
   * Aggregate statistics per tournament phase.
   * @returns {{phase:string,totalGoals:number,matchesPlayed:number}[]}
   */
  getPhaseStats() {
    const phases = [];
    if (this.groupService) {
      const groupMatches = this.groupService.getAllMatches?.() || [];
      const groupGoals = groupMatches.reduce((s, m) => s + (m.homeGoals ?? 0) + (m.awayGoals ?? 0), 0);
      phases.push({ phase: "Grupos", totalGoals: groupGoals, matchesPlayed: groupMatches.length });
    }
    if (this.knockoutService) {
      const rounds = ["R16", "QF", "SF", "F"];
      rounds.forEach(r => {
        const matches = this.knockoutService.getMatchesByRound?.(r) || [];
        const goals = matches.reduce((s, m) => s + (m.homeGoals ?? 0) + (m.awayGoals ?? 0), 0);
        phases.push({ phase: r, totalGoals: goals, matchesPlayed: matches.length });
      });
    }
    return phases;
  }

  /**
   * Compute a ranking of users based on their betting scores.
   * Assumes userService provides getAllUsers() and calculateScoreForUser(userId).
   * @returns {{userId:string,name:string,score:number}[]}
   */
  getUserRanking() {
    if (!this.userService) return [];
    const users = this.userService.getAllUsers?.() || [];
    const ranking = users.map(u => {
      const score = this.userService.calculateScoreForUser?.(u.id) ?? 0;
      return { userId: u.id, name: u.name, score };
    });
    ranking.sort((a, b) => b.score - a.score);
    return ranking;
  }

  /**
   * Export the user ranking as a CSV string.
   * @returns {string}
   */
  exportRankingCsv() {
    const rows = ["User ID,Name,Score"];
    this.getUserRanking().forEach(r => rows.push(`${r.userId},${r.name},${r.score}`));
    return rows.join("\n");
  }
}
