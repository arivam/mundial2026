const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db;

function getDbPath(app) {
  return path.join(app.getPath('userData'), 'polla2026.db');
}

function initDatabase(app) {
  const dbPath = getDbPath(app);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const count = db.prepare("SELECT COUNT(*) as c FROM settings").get().c;
  if (count === 0) {
    seedDatabase();
  }

  return db;
}

function seedDatabase() {
  const dataDir = path.join(__dirname, '..', 'data');
  const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  const seedTransaction = db.transaction(() => {
    const files = [
      { key: 'teams', file: 'teams.json' },
      { key: 'groups', file: 'groups.json' },
      { key: 'matches', file: 'matches.json' },
      { key: 'knockout', file: 'knockout.json' },
      { key: 'users', file: 'users.json' },
      { key: 'bets', file: 'bets.json' },
      { key: 'annex_c_table', file: 'annex_c_table.json' },
    ];

    for (const { key, file } of files) {
      const filePath = path.join(dataDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        insert.run(key, content);
      }
    }

    insert.run('knockout-results', '{}');
  });

  seedTransaction();
}

function getData(key) {
  if (!db) return null;

  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);

  if (key === 'knockout') {
    const bracket = row ? JSON.parse(row.value) : null;
    const resultsRow = db.prepare("SELECT value FROM settings WHERE key = 'knockout-results'").get();
    const results = resultsRow ? JSON.parse(resultsRow.value) : {};
    if (!bracket) return null;

    const merged = {};
    for (const [roundKey, matches] of Object.entries(bracket)) {
      merged[roundKey] = matches.map(m => {
        const saved = results[m.id] || {};
        return { ...m, ...saved };
      });
    }
    return merged;
  }

  if (key === 'knockout-results') {
    return row ? JSON.parse(row.value) : {};
  }

  if (key === 'matches') {
    if (!row) return [];
    const matches = JSON.parse(row.value);
    const savedRow = db.prepare("SELECT value FROM settings WHERE key = 'matches-scores'").get();
    if (savedRow) {
      const scores = JSON.parse(savedRow.value);
      scores.forEach(s => {
        const m = matches.find(x => x.id === s.id);
        if (m) Object.assign(m, s);
      });
    }
    return matches;
  }

  return row ? JSON.parse(row.value) : null;
}

function saveData(key, value) {
  if (!db) return false;

  if (key === 'knockout') {
    const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    insert.run('knockout-results', JSON.stringify(value));
    return true;
  }

  if (key === 'matches') {
    const scores = value.map(m => ({
      id: m.id,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      played: m.played
    }));
    const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    insert.run('matches-scores', JSON.stringify(scores));
    return true;
  }

  const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  insert.run(key, JSON.stringify(value));
  return true;
}

function resetDatabase(app) {
  if (db) {
    db.close();
  }
  const dbPath = getDbPath(app);
  try {
    fs.unlinkSync(dbPath);
    fs.unlinkSync(dbPath + '-wal');
    fs.unlinkSync(dbPath + '-shm');
  } catch (e) { }
  initDatabase(app);
}

module.exports = { initDatabase, getData, saveData, resetDatabase };
