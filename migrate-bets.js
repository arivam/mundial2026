const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const HTML_PATH = path.join(__dirname, 'data', 'REPORTE  POLLA 2026 (1).html');
const DATA_DIR = path.join(__dirname, 'data');

const html = fs.readFileSync(HTML_PATH, 'utf8');
const $ = cheerio.load(html);

const teamsJson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'teams.json'), 'utf8'));

const nameMap = {
  "Alemania": "Germany", "Alkemania": "Germany",
  "Arabia": "Saudi Arabia",
  "Argelia": "Algeria",
  "Argentina": "Argentina",
  "Australia": "Australia",
  "Austria": "Austria",
  "Belgica": "Belgium",
  "Bosnia": "Bosnia and Herzegovina",
  "Brasil": "Brazil",
  "Cabo Verde": "Cabo Verde",
  "Canada": "Canada",
  "Chequia": "Czechia", "chequia": "Czechia",
  "Colombia": "Colombia",
  "Congo": "DR Congo",
  "Corea": "South Korea",
  "Costa de Marfil": "Ivory Coast",
  "Croacia": "Croatia",
  "Curazao": "Curaçao",
  "Ecuador": "Ecuador", "Ecuadior": "Ecuador",
  "Egipto": "Egypt",
  "Escocia": "Scotland", "Ecocia": "Scotland", "Excocia": "Scotland",
  "España": "Spain", "españa": "Spain",
  "Francia": "France", "Franica": "France", "Franxia": "France",
  "Ghana": "Ghana",
  "Haiti": "Haiti",
  "Inglaterra": "England", "Inglaterrra": "England",
  "Iran": "Iran",
  "Iraq": "Iraq",
  "Japon": "Japan",
  "Jordania": "Jordan",
  "Marruecos": "Morocco",
  "Mexico": "Mexico",
  "Noruega": "Norway",
  "Nueva Zelanda": "New Zealand",
  "Paise Bajos": "Netherlands", "Paises Bajos": "Netherlands",
  "Panama": "Panama",
  "Paraguay": "Paraguay",
  "Portugal": "Portugal",
  "Qatar": "Qatar", "Quatar": "Qatar",
  "Rep. Congo": "DR Congo",
  "Senegal": "Senegal",
  "Suecia": "Sweden", "suecia": "Sweden",
  "Suiza": "Switzerland", "suiza": "Switzerland",
  "Sur Africa": "South Africa",
  "Tunez": "Tunisia",
  "Turquia": "Türkiye",
  "USA": "USA",
  "Uruguay": "Uruguay",
  "Usbequistan": "Uzbekistan", "Uzbekistan": "Uzbekistan", "Uzbequistan": "Uzbekistan"
};

const teamNameToId = {};
teamsJson.forEach(t => {
  teamNameToId[t.name] = t.id;
});

function resolveTeamId(spanishName) {
  if (!spanishName) return null;
  const s = spanishName.trim();
  const english = nameMap[s];
  if (!english) {
    console.warn("UNMAPPED:", s);
    return null;
  }
  const id = teamNameToId[english];
  if (!id) {
    console.warn("NOT IN TEAMS:", english);
    return null;
  }
  return id;
}

function cleanText(el) {
  return $(el).text().trim();
}

// Returns {r32, r16, qf, sf, f, podium} indices for a row with given numCells
function getColIndices(numCells) {
  const base = numCells === 16 ? 2 : 0;
  return {
    r32: [base, base + 1],
    r16: numCells >= 4 ? [base + 2, base + 3] : null,
    qf: numCells >= 6 ? [base + 4, base + 5] : null,
    sf: numCells >= 8 ? [base + 6, base + 7] : null,
    f: numCells === 16 ? [10, 11] : null,
    podium: numCells === 16 ? [12, 13, 14, 15] : null
  };
}

const rows = $('tr').toArray();
const groups = [];
let i = 0;

while (i < rows.length) {
  const firstTd = $(rows[i]).find('td').first();
  const rowspan = firstTd.attr('rowspan');

  if (rowspan === '32') {
    const userNumber = cleanText(firstTd);
    const userName = $(rows[i]).find('td').eq(1).text().trim();

    const userRows = [];
    for (let j = 0; j < 32 && (i + j) < rows.length; j++) {
      userRows.push($(rows[i + j]));
    }

    groups.push({ number: userNumber, name: userName, rows: userRows });
    i += 32;
  } else {
    i++;
  }
}

console.log("Users found:", groups.length);

const users = [];
const bets = [];

groups.forEach((g, idx) => {
  const userId = String(idx + 1);
  const betId = String(Date.now() + idx);

  users.push({ id: userId, name: g.name, email: '', phone: '' });

  const round32 = [];
  const round16 = [];
  const quarterfinals = [];
  const semifinals = [];
  let finalTeamId = null;
  let champion = null, runnerUp = null, thirdPlace = null, fourthPlace = null;

  g.rows.forEach(row => {
    const cells = row.find('td');
    const numCells = cells.length;
    if (numCells < 2) return;

    const ci = getColIndices(numCells);

    // Dieciseisavos (cols 3,4)
    const r32Idx = ci.r32;
    const groupLabel = cleanText(cells.eq(r32Idx[0]));
    const teamName = cleanText(cells.eq(r32Idx[1]));
    if (groupLabel && teamName && groupLabel !== 'Grupo' && !groupLabel.startsWith('#') && !/^(NOMBRES|EQUIPOS|DIECISEISAVOS|OCTAVOS|CUARTOS|SEMIFINAL|FINAL|CUARTO|TERCERO|SEGUNDO|CAMPEON)$/.test(groupLabel)) {
      const id = resolveTeamId(teamName);
      if (id && !round32.includes(id)) round32.push(id);
    }

    // Octavos (cols 5,6)
    if (ci.r16) {
      const matchRef = cleanText(cells.eq(ci.r16[0]));
      const team16 = cleanText(cells.eq(ci.r16[1]));
      if (matchRef.startsWith('#')) {
        const id = resolveTeamId(team16);
        if (id && !round16.includes(id)) round16.push(id);
      }
    }

    // Cuartos (cols 7,8)
    if (ci.qf) {
      const matchRef = cleanText(cells.eq(ci.qf[0]));
      const teamQF = cleanText(cells.eq(ci.qf[1]));
      if (matchRef.startsWith('#')) {
        const id = resolveTeamId(teamQF);
        if (id && !quarterfinals.includes(id)) quarterfinals.push(id);
      }
    }

    // Semifinal (cols 9,10)
    if (ci.sf) {
      const matchRef = cleanText(cells.eq(ci.sf[0]));
      const teamSF = cleanText(cells.eq(ci.sf[1]));
      if (matchRef.startsWith('#')) {
        const id = resolveTeamId(teamSF);
        if (id && !semifinals.includes(id)) semifinals.push(id);
      }
    }

    // Final (cols 11,12) - only in row 0
    if (ci.f && !finalTeamId) {
      const matchRef = cleanText(cells.eq(ci.f[0]));
      const teamF = cleanText(cells.eq(ci.f[1]));
      if (matchRef.startsWith('#')) {
        finalTeamId = resolveTeamId(teamF);
      }
    }

    // Podium (cols 13-16) - only in row 0
    if (ci.podium) {
      fourthPlace = resolveTeamId(cleanText(cells.eq(ci.podium[0])));
      thirdPlace = resolveTeamId(cleanText(cells.eq(ci.podium[1])));
      runnerUp = resolveTeamId(cleanText(cells.eq(ci.podium[2])));
      champion = resolveTeamId(cleanText(cells.eq(ci.podium[3])));
    }
  });

  bets.push({
    id: betId,
    userId: userId,
    betLabel: "Apuesta 1",
    round32: round32,
    round16: round16,
    quarterfinals: quarterfinals,
    champion: champion,
    runnerUp: runnerUp,
    thirdPlace: thirdPlace,
    fourthPlace: fourthPlace,
    score: 0
  });

  console.log(`${g.number}. ${g.name}: R32=${round32.length}, R16=${round16.length}, QF=${quarterfinals.length}, SF=${semifinals.length}, F=${finalTeamId ? 'ok' : '?'}, 4th=${fourthPlace || '?'}, 3rd=${thirdPlace || '?'}, 2nd=${runnerUp || '?'}, 1st=${champion || '?'}`);
});

fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(users, null, 2), 'utf8');
fs.writeFileSync(path.join(DATA_DIR, 'bets.json'), JSON.stringify(bets, null, 2), 'utf8');
console.log("\nMigration complete! Written to data/users.json and data/bets.json");
