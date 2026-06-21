/**
 * lib/scoring.js
 * Pure functions for scoring and tournament logic.
 * Extracted from statisticsInit.js and knockoutInit.js for testability.
 * No DOM dependencies — safe for Node.js / Jest.
 */

/**
 * Calculate standings for all groups from match results.
 */
function calculateStandings(groups, matches, teamMap) {
  const map = {};
  groups.forEach(g => {
    map[g.name] = (g.teamIds || []).map(id => ({
      teamId: id, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0
    }));
  });

  matches.forEach(m => {
    if (!m.played || m.homeScore === null || m.awayScore === null) return;
    const gName = m.group || (teamMap[m.homeTeamId] ? teamMap[m.homeTeamId].group : null);
    if (!gName || !map[gName]) return;

    const home = map[gName].find(t => t.teamId === m.homeTeamId);
    const away = map[gName].find(t => t.teamId === m.awayTeamId);
    if (!home || !away) return;

    home.played++; away.played++;
    home.goalsFor += m.homeScore; home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore; away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) { home.points += 3; }
    else if (m.awayScore > m.homeScore) { away.points += 3; }
    else { home.points++; away.points++; }
  });

  Object.keys(map).forEach(g => {
    map[g].sort((a, b) =>
      b.points - a.points ||
      (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor
    );
  });
  return map;
}

/**
 * Determine which teams are actually in each phase of the tournament.
 */
function calculateActualTeams(groups, matches, teamMap, bracket, knockoutResults) {
  const actual = {
    r32: [], r16: [], rQF: [], rSF: [], rF: [],
    champion: null, runnerUp: null, thirdPlace: null, fourthPlace: null
  };

  const standings = calculateStandings(groups, matches, teamMap);
  const thirds = [];
  Object.values(standings).forEach(groupStandings => {
    if (groupStandings[0] && groupStandings[0].played > 0) actual.r32.push(groupStandings[0].teamId);
    if (groupStandings[1] && groupStandings[1].played > 0) actual.r32.push(groupStandings[1].teamId);
    if (groupStandings[2] && groupStandings[2].played > 0) thirds.push({ ...groupStandings[2] });
  });
  thirds.sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor
  );
  thirds.slice(0, 8).forEach(t => actual.r32.push(t.teamId));

  const findIdByName = (name) => {
    if (!name) return null;
    const cleaned = name.includes(' - ') ? name.split(' - ').pop().trim() : name.trim();
    return Object.values(teamMap).find(t => t.name === cleaned)?.id;
  };

  const getWinners = (roundKey, targetList) => {
    (bracket[roundKey] || []).forEach(m => {
      const res = knockoutResults[m.id];
      if (res && res.played && res.winner) {
        const id = findIdByName(res.winner);
        if (id) targetList.push(id);
      }
    });
  };

  getWinners('roundOf32', actual.r16);
  getWinners('roundOf16', actual.rQF);
  getWinners('quarterFinals', actual.rSF);
  getWinners('semiFinals', actual.rF);

  const finalRes = knockoutResults[104];
  if (finalRes && finalRes.played) {
    actual.champion = findIdByName(finalRes.winner);
    actual.runnerUp = findIdByName(finalRes.loser);
  }
  const thirdRes = knockoutResults[103];
  if (thirdRes && thirdRes.played) {
    actual.thirdPlace = findIdByName(thirdRes.winner);
    actual.fourthPlace = findIdByName(thirdRes.loser);
  }

  return actual;
}

/**
 * Score a single bet against actual tournament results.
 */
function calculateBetScore(bet, actual) {
  const score = { r32: 0, r16: 0, rQF: 0, rSF: 0, rF: 0, fourth: 0, third: 0, runnerUp: 0, champion: 0, total: 0 };
  const hits = (betList, actualList) => (betList || []).filter(id => id && (actualList || []).includes(id)).length;

  score.r32 = hits(bet.round32, actual.r32) * 5;
  score.r16 = hits(bet.round16, actual.r16) * 10;
  score.rQF = hits(bet.quarterfinals, actual.rQF) * 20;

  const predictedSF = [bet.champion, bet.runnerUp, bet.thirdPlace, bet.fourthPlace].filter(id => id);
  const predictedF = [bet.champion, bet.runnerUp].filter(id => id);

  score.rSF = hits(predictedSF, actual.rSF) * 30;
  score.rF = hits(predictedF, actual.rF) * 40;

  if (bet.fourthPlace && actual.fourthPlace && bet.fourthPlace === actual.fourthPlace) score.fourth = 40;
  if (bet.thirdPlace && actual.thirdPlace && bet.thirdPlace === actual.thirdPlace) score.third = 50;
  if (bet.runnerUp && actual.runnerUp && bet.runnerUp === actual.runnerUp) score.runnerUp = 60;
  if (bet.champion && actual.champion && bet.champion === actual.champion) score.champion = 70;

  score.total = Object.values(score).reduce((a, b) => a + b, 0);
  return score;
}

/**
 * Resolve which third-place team goes to which R32 match using FIFA's Annex C.
 */
function resolveThirdPlaceMap(standings, teamMap, annexCTable) {
  const map = {};
  if (!annexCTable || !annexCTable.lookup) return map;

  const thirds = [];
  Object.keys(standings).forEach(groupName => {
    const pos = standings[groupName];
    if (pos && pos[2]) {
      thirds.push({
        teamId: pos[2].teamId,
        group: groupName,
        played: pos[2].played,
        points: pos[2].points,
        gf: pos[2].goalsFor,
        ga: pos[2].goalsAgainst,
        gd: pos[2].goalsFor - pos[2].goalsAgainst
      });
    }
  });

  const allGroupsPlayed = thirds.every(t => t.played >= 2);
  if (!allGroupsPlayed || thirds.length < 12) return map;

  thirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

  const top8 = thirds.slice(0, 8);
  const qualifyingGroups = top8.map(t => t.group).sort();

  const key = qualifyingGroups.join(',');
  const row = annexCTable.lookup[key];
  if (!row) return map;

  const SLOT_TO_MATCH = {
    '1A': 79, '1B': 85, '1D': 81, '1E': 74,
    '1G': 82, '1I': 77, '1K': 87, '1L': 80
  };

  Object.keys(row.assignments).forEach(slot => {
    const groupLetter = row.assignments[slot];
    const matchId = SLOT_TO_MATCH[slot];
    if (!matchId) return;

    const thirdEntry = top8.find(t => t.group === groupLetter);
    if (thirdEntry) {
      const team = teamMap[thirdEntry.teamId];
      if (team) {
        map[matchId] = team.name;
      }
    }
  });

  return map;
}

module.exports = {
  calculateStandings,
  calculateActualTeams,
  calculateBetScore,
  resolveThirdPlaceMap
};
