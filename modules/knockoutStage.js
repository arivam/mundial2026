// modules/knockoutStage.js
import { KnockoutMatch } from "../models/knockoutMatch.js";
import { Group } from "../models/group.js"; // for getQualifiedTeams

export class KnockoutGenerator {
  /**
   * Generate bracket matches from qualified teams.
   * @param {Array} qualifiedTeams - Array of Team objects ordered by group position.
   * @returns {Array<KnockoutMatch>} initial matches (Round of 16).
   */
  static generate(qualifiedTeams) {
    // Assuming 48 teams, top 2 from each of 12 groups => 24 teams.
    // For a standard knockout we need 16 teams. We'll take only the best 16 based on group order (first 16).
    // In many tournaments, 24 -> 8 (first round) then 16, but to keep simple we take top 16.
    const selected = qualifiedTeams.slice(0, 16);
    const matches = [];
    // Simple pairing: 1 vs 16, 2 vs 15, etc.
    for (let i = 0; i < 8; i++) {
      const home = selected[i];
      const away = selected[15 - i];
      const id = `R16-${i + 1}`;
      matches.push(new KnockoutMatch(id, home, away, "R16"));
    }
    return matches;
  }
}

export class KnockoutService {
  constructor() {
    this.matches = [];
    this.rounds = { R16: [], QF: [], SF: [], F: [] };
    this.loadData();
  }

  /** Load matches from JSON (test or production) */
  async loadData() {
    const fileName = `../data/${window.APP_MODE === "test" ? "knockout_test" : "knockout"}.json`;
    try {
      const res = await fetch(fileName);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      this.matches = data.map(m => new KnockoutMatch(m.id, m.homeTeam, m.awayTeam, m.round));
      this._assignRounds();
    } catch (e) {
      console.warn("Knockout data not found, generating fresh bracket");
      // generate fresh bracket using qualified teams from group service (will be set later)
    }
  }

  /** Set qualified teams and generate initial bracket */
  setQualifiedTeams(qualifiedTeams) {
    // generate initial R16 matches
    const r16 = KnockoutGenerator.generate(qualifiedTeams);
    this.matches = r16;
    this._assignRounds();
    this._save();
  }

  _assignRounds() {
    // clear rounds
    this.rounds = { R16: [], QF: [], SF: [], F: [] };
    this.matches.forEach(m => {
      this.rounds[m.round].push(m);
    });
  }

  getMatchesByRound(round) {
    return this.rounds[round] || [];
  }

  recordResult(matchId, homeGoals, awayGoals) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) throw new Error("Match not found");
    match.setResult(homeGoals, awayGoals);
    // propagate winner to next round if applicable
    this._propagateWinner(match);
    this._save();
  }

  _propagateWinner(match) {
    const roundOrder = ["R16", "QF", "SF", "F"];
    const idx = roundOrder.indexOf(match.round);
    if (idx === -1 || idx === roundOrder.length - 1) return; // final or unknown
    const nextRound = roundOrder[idx + 1];
    // Find the placeholder match in next round that expects this winner.
    // Simple algorithm: each two consecutive matches in current round feed one match in next round.
    const positionInRound = this.rounds[match.round].indexOf(match);
    const targetMatchIdx = Math.floor(positionInRound / 2);
    const targetMatch = this.rounds[nextRound][targetMatchIdx];
    if (!targetMatch) return;
    // Determine if this match is home or away in the next match (even index => home, odd => away)
    const isHome = positionInRound % 2 === 0;
    if (isHome) {
      targetMatch.homeTeam = match.getWinner();
    } else {
      targetMatch.awayTeam = match.getWinner();
    }
  }

    // Render the bracket into a container
    renderBracket(containerId = 'knockoutContainer') {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      const rounds = ['R16', 'QF', 'SF', 'F'];
      rounds.forEach(round => {
        const matches = this.getMatchesByRound(round);
        if (matches.length === 0) return;
        const roundDiv = document.createElement('div');
        roundDiv.className = 'knockout-round';
        const title = document.createElement('h3');
        title.textContent = round;
        roundDiv.appendChild(title);
        matches.forEach(match => {
          const matchDiv = document.createElement('div');
          matchDiv.className = 'knockout-match';
          const home = match.homeTeam ? match.homeTeam.name : 'TBD';
          const away = match.awayTeam ? match.awayTeam.name : 'TBD';
          const score = (match.homeGoals != null && match.awayGoals != null) ? `${match.homeGoals}-${match.awayGoals}` : '';
          matchDiv.textContent = `${home} vs ${away} ${score}`;
          roundDiv.appendChild(matchDiv);
        });
        container.appendChild(roundDiv);
      });
    }

  async _save() {
    const fileName = `../data/${window.APP_MODE === "test" ? "knockout_test" : "knockout"}.json`;
    const payload = this.matches.map(m => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      round: m.round,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals
    }));
    // Try to persist via fetch PUT (static server won't allow), fallback to localStorage
    try {
      await fetch(fileName, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // fallback
      localStorage.setItem(`knockout_${window.APP_MODE}`, JSON.stringify(payload));
    }
  }
}
