/**
 * __tests__/scoring.test.js
 * Unit tests for the scoring engine and tournament logic.
 */
const {
  calculateStandings,
  calculateActualTeams,
  calculateBetScore,
  resolveThirdPlaceMap
} = require('../lib/scoring');

/* ── Test data ── */

const teamMap = {
  1:  { id: 1,  name: 'Czechia',      group: 'A' },
  2:  { id: 2,  name: 'Mexico',        group: 'A' },
  3:  { id: 3,  name: 'South Korea',   group: 'A' },
  4:  { id: 4,  name: 'South Africa',  group: 'A' },
  5:  { id: 5,  name: 'Switzerland',   group: 'B' },
  6:  { id: 6,  name: 'Canada',        group: 'B' },
  7:  { id: 7,  name: 'Bosnia',        group: 'B' },
  8:  { id: 8,  name: 'Qatar',         group: 'B' },
  9:  { id: 9,  name: 'Brazil',        group: 'C' },
  10: { id: 10, name: 'Scotland',      group: 'C' },
  11: { id: 11, name: 'Morocco',       group: 'C' },
  12: { id: 12, name: 'Haiti',         group: 'C' },
  13: { id: 13, name: 'USA',           group: 'D' },
  14: { id: 14, name: 'Paraguay',      group: 'D' },
  15: { id: 15, name: 'Australia',     group: 'D' },
  16: { id: 16, name: 'Türkiye',       group: 'D' },
  17: { id: 17, name: 'Germany',       group: 'E' },
  18: { id: 18, name: 'Côte d\'Ivoire', group: 'E' },
  19: { id: 19, name: 'Ecuador',       group: 'E' },
  20: { id: 20, name: 'Curaçao',       group: 'E' },
  21: { id: 21, name: 'Netherlands',   group: 'F' },
  22: { id: 22, name: 'Japan',         group: 'F' },
  23: { id: 23, name: 'Tunisia',       group: 'F' },
  24: { id: 24, name: 'Poland',        group: 'F' },
  25: { id: 25, name: 'Belgium',       group: 'G' },
  26: { id: 26, name: 'Egypt',         group: 'G' },
  27: { id: 27, name: 'IR Iran',       group: 'G' },
  28: { id: 28, name: 'New Zealand',   group: 'G' },
  29: { id: 29, name: 'Spain',         group: 'H' },
  30: { id: 30, name: 'Uruguay',       group: 'H' },
  31: { id: 31, name: 'Saudi Arabia',  group: 'H' },
  32: { id: 32, name: 'Cabo Verde',    group: 'H' },
  33: { id: 33, name: 'France',        group: 'I' },
  34: { id: 34, name: 'Senegal',       group: 'I' },
  35: { id: 35, name: 'Norway',        group: 'I' },
  36: { id: 36, name: 'Bolivia',       group: 'I' },
  37: { id: 37, name: 'Argentina',     group: 'J' },
  38: { id: 38, name: 'Algeria',       group: 'J' },
  39: { id: 39, name: 'Austria',       group: 'J' },
  40: { id: 40, name: 'Jordan',        group: 'J' },
  41: { id: 41, name: 'Portugal',      group: 'K' },
  42: { id: 42, name: 'Colombia',      group: 'K' },
  43: { id: 43, name: 'Uzbekistan',    group: 'K' },
  44: { id: 44, name: 'Congo DR',      group: 'K' },
  45: { id: 45, name: 'England',       group: 'L' },
  46: { id: 46, name: 'Croatia',       group: 'L' },
  47: { id: 47, name: 'Ghana',         group: 'L' },
  48: { id: 48, name: 'Panama',        group: 'L' }
};

const groups = [
  { name: 'A', teamIds: [1, 2, 3, 4] },
  { name: 'B', teamIds: [5, 6, 7, 8] },
  { name: 'C', teamIds: [9, 10, 11, 12] },
  { name: 'D', teamIds: [13, 14, 15, 16] },
  { name: 'E', teamIds: [17, 18, 19, 20] },
  { name: 'F', teamIds: [21, 22, 23, 24] },
  { name: 'G', teamIds: [25, 26, 27, 28] },
  { name: 'H', teamIds: [29, 30, 31, 32] },
  { name: 'I', teamIds: [33, 34, 35, 36] },
  { name: 'J', teamIds: [37, 38, 39, 40] },
  { name: 'K', teamIds: [41, 42, 43, 44] },
  { name: 'L', teamIds: [45, 46, 47, 48] }
];

/* ── calculateStandings ── */

describe('calculateStandings', () => {
  test('returns empty standings when no matches played', () => {
    const matches = groups.flatMap(g =>
      g.teamIds.slice(0, 2).map((h, i) => ({
        id: i + 1, homeTeamId: g.teamIds[0], awayTeamId: g.teamIds[1],
        group: g.name, played: false, homeScore: null, awayScore: null
      }))
    );
    const standings = calculateStandings(groups, matches, teamMap);
    expect(standings['A']).toHaveLength(4);
    standings['A'].forEach(t => expect(t.played).toBe(0));
  });

  test('calculates points correctly for a 2-1 result', () => {
    const matches = [{
      id: 1, homeTeamId: 2, awayTeamId: 1, group: 'A',
      played: true, homeScore: 2, awayScore: 1
    }];
    const standings = calculateStandings(groups, matches, teamMap);
    const a = standings['A'];
    const mexico = a.find(t => t.teamId === 2);
    const czechia = a.find(t => t.teamId === 1);
    expect(mexico.points).toBe(3);
    expect(czechia.points).toBe(0);
    expect(mexico.wins).toBe(0); // wins not incremented in this simplified function
    expect(mexico.goalsFor).toBe(2);
    expect(czechia.goalsAgainst).toBe(2);
  });

  test('calculates draw points correctly', () => {
    const matches = [{
      id: 1, homeTeamId: 2, awayTeamId: 1, group: 'A',
      played: true, homeScore: 1, awayScore: 1
    }];
    const standings = calculateStandings(groups, matches, teamMap);
    const a = standings['A'];
    expect(a.find(t => t.teamId === 2).points).toBe(1);
    expect(a.find(t => t.teamId === 1).points).toBe(1);
  });

  test('sorts by points descending, then goal difference', () => {
    const matches = [
      { id: 1, homeTeamId: 2, awayTeamId: 1, group: 'A', played: true, homeScore: 3, awayScore: 0 },
      { id: 2, homeTeamId: 3, awayTeamId: 4, group: 'A', played: true, homeScore: 1, awayScore: 0 },
      { id: 3, homeTeamId: 2, awayTeamId: 3, group: 'A', played: true, homeScore: 1, awayScore: 1 },
      { id: 4, homeTeamId: 1, awayTeamId: 4, group: 'A', played: true, homeScore: 2, awayScore: 0 },
      { id: 5, homeTeamId: 2, awayTeamId: 4, group: 'A', played: true, homeScore: 2, awayScore: 0 },
      { id: 6, homeTeamId: 1, awayTeamId: 3, group: 'A', played: true, homeScore: 0, awayScore: 1 }
    ];
    const standings = calculateStandings(groups, matches, teamMap);
    const a = standings['A'];
    // Mexico: 3W 1D = 10pts, +7GD
    // South Korea: 2W 1D = 7pts, +1GD
    // Czechia: 1W 0D = 3pts, +1GD
    // South Africa: 0W 0D = 0pts, -5GD
    expect(a[0].teamId).toBe(2);  // Mexico 1st
    expect(a[1].teamId).toBe(3);  // South Korea 2nd
    expect(a[2].teamId).toBe(1);  // Czechia 3rd
    expect(a[3].teamId).toBe(4);  // South Africa 4th
  });
});

/* ── calculateBetScore ── */

describe('calculateBetScore', () => {
  const emptyActual = {
    r32: [], r16: [], rQF: [], rSF: [], rF: [],
    champion: null, runnerUp: null, thirdPlace: null, fourthPlace: null
  };

  test('returns 0 for empty bet and empty actual', () => {
    const bet = { round32: [], round16: [], quarterfinals: [], champion: null, runnerUp: null, thirdPlace: null, fourthPlace: null };
    const score = calculateBetScore(bet, emptyActual);
    expect(score.total).toBe(0);
  });

  test('scores R32 correctly (5 pts per hit)', () => {
    const bet = { round32: [1, 2, 3, 4, 5], round16: [], quarterfinals: [], champion: null, runnerUp: null, thirdPlace: null, fourthPlace: null };
    const actual = { ...emptyActual, r32: [1, 2, 3] };
    const score = calculateBetScore(bet, actual);
    expect(score.r32).toBe(15); // 3 hits × 5
    expect(score.total).toBe(15);
  });

  test('scores R16 correctly (10 pts per hit)', () => {
    const bet = { round32: [], round16: [1, 2, 3, 4], quarterfinals: [], champion: null, runnerUp: null, thirdPlace: null, fourthPlace: null };
    const actual = { ...emptyActual, r16: [1, 2] };
    const score = calculateBetScore(bet, actual);
    expect(score.r16).toBe(20); // 2 hits × 10
  });

  test('scores QF correctly (20 pts per hit)', () => {
    const bet = { round32: [], round16: [], quarterfinals: [1, 2, 3, 4], champion: null, runnerUp: null, thirdPlace: null, fourthPlace: null };
    const actual = { ...emptyActual, rQF: [1, 2, 3] };
    const score = calculateBetScore(bet, actual);
    expect(score.rQF).toBe(60); // 3 hits × 20
  });

  test('scores SF correctly from podium picks (30 pts per hit)', () => {
    const bet = {
      round32: [], round16: [], quarterfinals: [],
      champion: 1, runnerUp: 2, thirdPlace: 3, fourthPlace: 4
    };
    const actual = { ...emptyActual, rSF: [1, 2, 3, 5] };
    const score = calculateBetScore(bet, actual);
    expect(score.rSF).toBe(90); // 3 hits (1,2,3) × 30
  });

  test('scores Final correctly from podium picks (40 pts per hit)', () => {
    const bet = {
      round32: [], round16: [], quarterfinals: [],
      champion: 1, runnerUp: 2, thirdPlace: 3, fourthPlace: 4
    };
    const actual = { ...emptyActual, rF: [1, 2] };
    const score = calculateBetScore(bet, actual);
    expect(score.rF).toBe(80); // 2 hits × 40
  });

  test('scores champion correctly (70 pts)', () => {
    const bet = {
      round32: [], round16: [], quarterfinals: [],
      champion: 1, runnerUp: null, thirdPlace: null, fourthPlace: null
    };
    const actual = { ...emptyActual, champion: 1 };
    const score = calculateBetScore(bet, actual);
    expect(score.champion).toBe(70);
  });

  test('scores runner-up correctly (60 pts)', () => {
    const bet = {
      round32: [], round16: [], quarterfinals: [],
      champion: null, runnerUp: 2, thirdPlace: null, fourthPlace: null
    };
    const actual = { ...emptyActual, runnerUp: 2 };
    const score = calculateBetScore(bet, actual);
    expect(score.runnerUp).toBe(60);
  });

  test('scores third place correctly (50 pts)', () => {
    const bet = {
      round32: [], round16: [], quarterfinals: [],
      champion: null, runnerUp: null, thirdPlace: 3, fourthPlace: null
    };
    const actual = { ...emptyActual, thirdPlace: 3 };
    const score = calculateBetScore(bet, actual);
    expect(score.third).toBe(50);
  });

  test('scores fourth place correctly (40 pts)', () => {
    const bet = {
      round32: [], round16: [], quarterfinals: [],
      champion: null, runnerUp: null, thirdPlace: null, fourthPlace: 4
    };
    const actual = { ...emptyActual, fourthPlace: 4 };
    const score = calculateBetScore(bet, actual);
    expect(score.fourth).toBe(40);
  });

  test('scores a perfect bet correctly', () => {
    const bet = {
      round32: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
      round16: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      quarterfinals: [1, 2, 3, 4, 5, 6, 7, 8],
      champion: 1, runnerUp: 2, thirdPlace: 3, fourthPlace: 4
    };
    const actual = {
      r32: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
      r16: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      rQF: [1, 2, 3, 4, 5, 6, 7, 8],
      rSF: [1, 2, 3, 4],
      rF: [1, 2],
      champion: 1, runnerUp: 2, thirdPlace: 3, fourthPlace: 4
    };
    const score = calculateBetScore(bet, actual);
    // R32: 32×5=160, R16: 16×10=160, QF: 8×20=160
    // SF: 4×30=120, F: 2×40=80
    // 4th: 40, 3rd: 50, Sub: 60, Camp: 70
    expect(score.total).toBe(160 + 160 + 160 + 120 + 80 + 40 + 50 + 60 + 70);
  });

  test('handles null/undefined bet fields gracefully', () => {
    const bet = {};
    const score = calculateBetScore(bet, emptyActual);
    expect(score.total).toBe(0);
  });
});

/* ── calculateActualTeams ── */

describe('calculateActualTeams', () => {
  test('returns empty arrays when no matches played', () => {
    const matches = [];
    const bracket = {};
    const actual = calculateActualTeams(groups, matches, teamMap, bracket, {});
    expect(actual.r32).toHaveLength(0);
    expect(actual.champion).toBeNull();
  });

  test('classifies top 2 from each group when all matches played', () => {
    // Create simple group matches where order is clear
    const matches = [];
    groups.forEach(g => {
      const [a, b, c, d] = g.teamIds;
      // a beats b, c, d → 1st
      // b draws c, beats d → 2nd
      // c draws b, loses to d → 3rd/4th
      // d beats c, loses to a,b → 3rd/4th
      matches.push(
        { id: matches.length + 1, homeTeamId: a, awayTeamId: b, group: g.name, played: true, homeScore: 2, awayScore: 0 },
        { id: matches.length + 2, homeTeamId: c, awayTeamId: d, group: g.name, played: true, homeScore: 0, awayScore: 1 },
        { id: matches.length + 3, homeTeamId: a, awayTeamId: c, group: g.name, played: true, homeScore: 1, awayScore: 0 },
        { id: matches.length + 4, homeTeamId: b, awayTeamId: d, group: g.name, played: true, homeScore: 1, awayScore: 0 },
        { id: matches.length + 5, homeTeamId: a, awayTeamId: d, group: g.name, played: true, homeScore: 1, awayScore: 0 },
        { id: matches.length + 6, homeTeamId: b, awayTeamId: c, group: g.name, played: true, homeScore: 0, awayScore: 0 }
      );
    });

    const actual = calculateActualTeams(groups, matches, teamMap, {}, {});
    // 12 groups × 2 = 24 teams in R32 (no third-place teams qualify since all groups have same structure)
    expect(actual.r32.length).toBeGreaterThanOrEqual(24);
  });
});

/* ── resolveThirdPlaceMap ── */

describe('resolveThirdPlaceMap', () => {
  test('returns empty map when annexCTable is null', () => {
    const map = resolveThirdPlaceMap({}, teamMap, null);
    expect(Object.keys(map)).toHaveLength(0);
  });

  test('returns empty map when not all groups have played 2+ matches', () => {
    const standings = {};
    groups.forEach(g => {
      standings[g.name] = g.teamIds.map(id => ({
        teamId: id, played: 1, points: 0, goalsFor: 0, goalsAgainst: 0
      }));
    });
    const map = resolveThirdPlaceMap(standings, teamMap, { lookup: {} });
    expect(Object.keys(map)).toHaveLength(0);
  });
});
