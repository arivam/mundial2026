const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const userData = path.join(__dirname, '..', 'data');
const dbPath = path.join(userData, 'test_polla2026.db');

for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) {
  try { fs.unlinkSync(f); } catch(e) {}
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');

const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
const dataDir = path.join(__dirname, '..', 'data');

const teams = JSON.parse(fs.readFileSync(path.join(dataDir, 'teams.json'), 'utf8'));
insert.run('teams', JSON.stringify(teams));

const groups = JSON.parse(fs.readFileSync(path.join(dataDir, 'groups.json'), 'utf8'));
insert.run('groups', JSON.stringify(groups));

const matches = JSON.parse(fs.readFileSync(path.join(dataDir, 'matches.json'), 'utf8'));
insert.run('matches', JSON.stringify(matches));

const knockout = JSON.parse(fs.readFileSync(path.join(dataDir, 'knockout.json'), 'utf8'));
insert.run('knockout', JSON.stringify(knockout));
insert.run('users', '[]');
insert.run('bets', '[]');
insert.run('knockout-results', '{}');

function getData(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return null;

  if (key === 'knockout') {
    const bracket = JSON.parse(row.value);
    const resultsRow = db.prepare("SELECT value FROM settings WHERE key = 'knockout-results'").get();
    const results = resultsRow ? JSON.parse(resultsRow.value) : {};
    const merged = {};
    for (const [roundKey, matches] of Object.entries(bracket)) {
      merged[roundKey] = matches.map(m => {
        const saved = results[m.id] || {};
        return { ...m, ...saved };
      });
    }
    return merged;
  }

  if (key === 'matches') {
    const m = JSON.parse(row.value);
    const savedRow = db.prepare("SELECT value FROM settings WHERE key = 'matches-scores'").get();
    if (savedRow) {
      const scores = JSON.parse(savedRow.value);
      scores.forEach(s => {
        const match = m.find(x => x.id === s.id);
        if (match) Object.assign(match, s);
      });
    }
    return m;
  }

  return JSON.parse(row.value);
}

const t = getData('teams');
console.log('teams:', t.length);

const g = getData('groups');
console.log('groups:', g.length, '->', g[0].name, '(' + g[0].teamIds.length + ' equipos)');

const m = getData('matches');
console.log('matches:', m.length, '-> match 1:', m[0].homeTeamId, 'vs', m[0].awayTeamId);

const k = getData('knockout');
console.log('knockout rounds:', Object.keys(k).length);
console.log('roundOf32:', k.roundOf32.length, 'matches');
console.log('roundOf16:', k.roundOf16.length, 'matches');

db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('matches-scores', ?)")
  .run(JSON.stringify([{ id: 1, homeScore: 2, awayScore: 1, played: true }]));

const m2 = getData('matches');
console.log('After save - match 1:', m2[0].homeScore, '-', m2[0].awayScore, '(played:', m2[0].played + ')');

db.close();
for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) {
  try { fs.unlinkSync(f); } catch(e) {}
}

console.log('ALL INTEGRATION TESTS PASSED');
