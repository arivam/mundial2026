// js/knockoutInit.js
// Inicialización de pages/knockout-stage.html.
// Carga knockout.json (o knockout_test.json) y renderiza el bracket de
// eliminatorias con la estructura de rondas definida en el JSON.

document.addEventListener('DOMContentLoaded', async () => {
  const ROOT = '../';

  let bracket, teams, groups, groupMatches;

  try {
    [bracket, teams, groups, groupMatches] = await Promise.all([
      loadData('knockout', ROOT),
      loadData('teams', ROOT),
      loadData('groups', ROOT),
      loadData('matches', ROOT)
    ]);
  } catch (err) {
    console.error('Error cargando datos de eliminatorias:', err);
    showKnockoutError('No se pudieron cargar los datos de eliminatorias.');
    return;
  }

  // Mezclar resultados guardados de fase de grupos para calcular posiciones actuales
  const savedGroupMatches = loadFromStorage('matches');
  if (savedGroupMatches) {
    savedGroupMatches.forEach(saved => {
      const m = groupMatches.find(x => x.id === saved.id);
      if (m) Object.assign(m, saved);
    });
  }

  // Recuperar resultados guardados en localStorage
  const savedResults = loadFromStorage('knockout') || {};

  // Mapa equipo por id
  const teamMap = {};
  teams.forEach(t => { teamMap[t.id] = t; });

  // Calcular posiciones actuales de los grupos
  const standings = calculateStandings(groups, groupMatches, teamMap);

  renderBracket(bracket, teamMap, savedResults, standings);
  setupSaveHandlers(bracket, teamMap, savedResults, standings);
});

/* ────────────── Renderizado del bracket ────────────── */

const ROUND_LABELS = {
  roundOf32:     'Ronda de 32',
  roundOf16:     'Octavos de Final',
  quarterFinals: 'Cuartos de Final',
  semiFinals:    'Semifinales',
  thirdPlace:    'Tercer Puesto',
  final:         'Final'
};

const ROUND_ORDER = ['roundOf32', 'roundOf16', 'quarterFinals', 'semiFinals', 'thirdPlace', 'final'];

function renderBracket(bracket, teamMap, savedResults, standings) {
  const container = document.getElementById('knockoutContainer');
  if (!container) return;
  container.innerHTML = '';

  ROUND_ORDER.forEach(roundKey => {
    const matches = bracket[roundKey];
    if (!matches || matches.length === 0) return;

    const roundDiv = document.createElement('section');
    roundDiv.className = 'knockout-round';
    roundDiv.id = `round-${roundKey}`;

    const title = document.createElement('h3');
    title.className = 'knockout-round-title';
    title.textContent = ROUND_LABELS[roundKey] || roundKey;
    roundDiv.appendChild(title);

    const matchesGrid = document.createElement('div');
    matchesGrid.className = 'knockout-matches-grid';

    matches.forEach(match => {
      const saved = savedResults[match.id] || {};
      const homeSource = match.homeSource || '?';
      const awaySource = match.awaySource || '?';

      // Resolver nombres de equipos a partir de resultados guardados previos
      const homeLabel = resolveSource(homeSource, savedResults, bracket, standings, teamMap);
      const awayLabel = resolveSource(awaySource, savedResults, bracket, standings, teamMap);

      const matchDiv = document.createElement('div');
      matchDiv.className = `knockout-match${saved.played ? ' played' : ''}`;
      matchDiv.dataset.matchId = match.id;
      matchDiv.dataset.roundKey = roundKey;

      matchDiv.innerHTML = `
        <div class="ko-match-header">Partido ${match.id}</div>
        <div class="ko-teams">
          <div class="ko-team home">
            <span class="ko-team-name">${homeLabel}</span>
            <input type="number" class="score-input ko-home-score" min="0" max="99"
              value="${saved.homeScore !== undefined ? saved.homeScore : ''}"
              placeholder="-" data-match-id="${match.id}" data-side="home">
          </div>
          <span class="ko-vs">vs</span>
          <div class="ko-team away">
            <input type="number" class="score-input ko-away-score" min="0" max="99"
              value="${saved.awayScore !== undefined ? saved.awayScore : ''}"
              placeholder="-" data-match-id="${match.id}" data-side="away">
            <span class="ko-team-name">${awayLabel}</span>
          </div>
        </div>
        ${match.winnerTo ? `<div class="ko-winner-to">Ganador → Partido ${match.winnerTo}</div>` : ''}
        ${match.loserTo ? `<div class="ko-loser-to">Perdedor → Partido ${match.loserTo}</div>` : ''}
        <button class="btn-save-score ko-save-btn" data-match-id="${match.id}">💾 Guardar</button>
      `;

      matchesGrid.appendChild(matchDiv);
    });

    roundDiv.appendChild(matchesGrid);
    container.appendChild(roundDiv);
  });
}

/**
 * Intenta resolver la etiqueta de origen a un nombre de equipo.
 * Si la fuente es "WNN" (ganador partido NN) y ese partido ya tiene resultado,
 * devuelve el nombre del equipo ganador.
 * Si es "1A", "2B", etc., devuelve el equipo que ocupa esa posición.
 */
function resolveSource(source, savedResults, bracket, standings, teamMap) {
  if (!source) return '?';

  // W73 → ganador del partido 73
  const winnerMatch = source.match(/^W(\d+)$/);
  if (winnerMatch) {
    const matchId = +winnerMatch[1];
    const saved = savedResults[matchId];
    return (saved && saved.played && saved.winner) ? `Gan. P${matchId} - ${saved.winner}` : `Gan. P${matchId}`;
  }

  // L101 → perdedor del partido 101
  const loserMatch = source.match(/^L(\d+)$/);
  if (loserMatch) {
    const matchId = +loserMatch[1];
    const saved = savedResults[matchId];
    return (saved && saved.played && saved.loser) ? `Per. P${matchId} - ${saved.loser}` : `Per. P${matchId}`;
  }

  // 1A, 2B, 3C… → posición del grupo
  const groupMatch = source.match(/^(\d)([A-L])$/);
  if (groupMatch) {
    const pos = parseInt(groupMatch[1], 10);
    const groupName = groupMatch[2];
    const groupStandings = standings[groupName];
    if (groupStandings && groupStandings[pos - 1]) {
      const team = teamMap[groupStandings[pos - 1].teamId];
      return team ? `${source} - ${team.name}` : source;
    }
  }

  return source;
}

/**
 * Calcula posiciones de grupos (lógica compartida con groupStageInit)
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
    map[g].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
  });
  return map;
}

/* ────────────── Eventos para guardar resultados ────────────── */

function setupSaveHandlers(bracket, teamMap, savedResults, standings) {
  const container = document.getElementById('knockoutContainer');
  if (!container) return;

  container.addEventListener('click', e => {
    const btn = e.target.closest('.ko-save-btn');
    if (!btn) return;

    const matchId = +btn.dataset.matchId;
    const matchDiv = container.querySelector(`.knockout-match[data-match-id="${matchId}"]`);
    const homeInput = matchDiv.querySelector('.ko-home-score');
    const awayInput = matchDiv.querySelector('.ko-away-score');

    const hsStr = homeInput.value.trim();
    const asStr = awayInput.value.trim();

    if (hsStr === '' || asStr === '' || isNaN(parseInt(hsStr)) || isNaN(parseInt(asStr))) {
      alert('Los marcadores deben ser números enteros no negativos (sin empates en eliminatorias, ingresa el marcador de penales).');
      return;
    }

    const hs = parseInt(hsStr, 10);
    const as_ = parseInt(asStr, 10);

    const homeNameEl = matchDiv.querySelector('.ko-team.home .ko-team-name');
    const awayNameEl = matchDiv.querySelector('.ko-team.away .ko-team-name');
    const homeName = homeNameEl ? homeNameEl.textContent.trim() : '?';
    const awayName = awayNameEl ? awayNameEl.textContent.trim() : '?';

    const winner = hs > as_ ? homeName : (as_ > hs ? awayName : null);
    const loser = hs > as_ ? awayName : (as_ > hs ? homeName : null);

    savedResults[matchId] = {
      homeScore: hs, awayScore: as_,
      played: true,
      winner, loser
    };

    saveToStorage('knockout', savedResults);
    matchDiv.classList.add('played');

    if (winner) {
      alert(`✅ Resultado guardado. Ganador: ${winner}`);
    } else {
      alert('✅ Resultado guardado (empate registrado – verifica penales).');
    }

    // Re-renderizar para actualizar fuentes
    renderBracket(bracket, teamMap, savedResults, standings);
  });
}

function showKnockoutError(msg) {
  const c = document.getElementById('knockoutContainer');
  if (c) c.innerHTML = `<p class="error-text">⚠️ ${msg}</p>`;
}
