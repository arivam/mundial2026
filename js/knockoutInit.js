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
  const savedGroupMatches = await loadFromStorage('matches');
  if (savedGroupMatches) {
    savedGroupMatches.forEach(saved => {
      const m = groupMatches.find(x => x.id === saved.id);
      if (m) Object.assign(m, saved);
    });
  }

  // Recuperar resultados guardados en localStorage
  const savedResults = await loadFromStorage('knockout') || {};

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

/**
 * Calcula los mejores terceros puestos y resuelve qué equipo va a cada llave
 * usando la tabla Annex C de FIFA (495 combinaciones).
 * Retorna un mapa { matchId: nombreEquipo } para los partidos R32 con terceros.
 */
function resolveThirdPlaceMap(standings, teamMap, annexCTable) {
  const map = {};

  // 1. Recoger los terceros de cada grupo
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

  // 2. Verificar que todos los grupos tengan al menos 2 partidos jugados
  const allGroupsPlayed = thirds.every(t => t.played >= 2);
  if (!allGroupsPlayed || thirds.length < 12) return map;

  // 3. Rankear terceros: puntos → diferencia goles → goles favor
  thirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

  // 4. Seleccionar los 8 mejores
  const top8 = thirds.slice(0, 8);

  // Mapeo de partidos R32 que reciben un tercer puesto
  const THIRD_MATCH_IDS = [74, 77, 79, 80, 81, 82, 85, 87];

  // 5. Intentar usar tabla Annex C si está disponible
  if (annexCTable && annexCTable.lookup) {
    const qualifyingGroups = top8.map(t => t.group).sort();
    const key = qualifyingGroups.join(',');
    const row = annexCTable.lookup[key];

    if (row) {
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
          if (team) map[matchId] = team.name;
        }
      });

      return map;
    }
  }

  // 6. Fallback: asignar los 8 mejores terceros por orden de ranking
  //    1° mejor → match 74, 2° → match 77, 3° → match 79, etc.
  top8.forEach((third, i) => {
    const matchId = THIRD_MATCH_IDS[i];
    if (matchId && third) {
      const team = teamMap[third.teamId];
      if (team) map[matchId] = team.name;
    }
  });

  return map;
}

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

      const homeLabel = resolveSource(homeSource, savedResults, bracket, standings, teamMap);
      const awayLabel = resolveSource(awaySource, savedResults, bracket, standings, teamMap);

      const isThirdPlaceAway = /^3[A-Z]/.test(awaySource);

      const matchDiv = document.createElement('div');
      matchDiv.className = `knockout-match${saved.played ? ' played' : ''}`;
      matchDiv.dataset.matchId = match.id;
      matchDiv.dataset.roundKey = roundKey;

      const awayHtml = isThirdPlaceAway
        ? renderThirdPlaceSelect(match.id, awaySource, standings, teamMap, savedResults._thirdPlaceSelections)
        : `<span class="ko-team-name">${awayLabel}</span>`;

      const hasPenalties = saved.penaltiesHome !== undefined && saved.penaltiesAway !== undefined;
      const penStyle = hasPenalties ? '' : ' style="display:none"';

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
            ${awayHtml}
          </div>
        </div>
        <div class="ko-penalties"${penStyle}>
          <span class="ko-penalties-label">Penales:</span>
          <input type="number" class="score-input ko-pen-home" min="0" max="99"
            value="${saved.penaltiesHome !== undefined ? saved.penaltiesHome : ''}"
            placeholder="-" data-match-id="${match.id}">
          <span class="ko-vs">-</span>
          <input type="number" class="score-input ko-pen-away" min="0" max="99"
            value="${saved.penaltiesAway !== undefined ? saved.penaltiesAway : ''}"
            placeholder="-" data-match-id="${match.id}">
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

/* ────────────── Selectores de terceros puestos ────────────── */

/**
 * Parsea "3A/B/C/D/F" → ["A","B","C","D","F"]
 */
function getThirdPlaceGroups(source) {
  const m = source.match(/^3([A-Z](?:\/[A-Z])*)$/);
  return m ? m[1].split('/') : null;
}

/**
 * Genera el HTML de un <select> con los terceros puestos disponibles
 * para un partido de Ronda de 32.
 */
function renderThirdPlaceSelect(matchId, awaySource, standings, teamMap, selections) {
  const groups = getThirdPlaceGroups(awaySource);
  if (!groups) return '<span class="ko-team-name">?</span>';

  const sel = selections || {};
  const selectedId = sel[matchId] ? Number(sel[matchId]) : null;
  const usedTeamIds = new Set();
  Object.values(sel).forEach(tid => { if (tid) usedTeamIds.add(Number(tid)); });

  let html = `<select class="third-place-select" data-match-id="${matchId}">`;
  html += '<option value="">— 3er puesto —</option>';

  groups.forEach(groupName => {
    const pos = standings[groupName];
    if (!pos || !pos[2]) return;
    const team = teamMap[pos[2].teamId];
    if (!team) return;

    const tid = Number(team.id);
    const disabled = usedTeamIds.has(tid) && tid !== selectedId;
    const selected = tid === selectedId;
    html += `<option value="${tid}"${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}>${groupName} - ${team.name}</option>`;
  });

  html += '</select>';
  return html;
}

/**
 * Re-fresca los options de todos los dropdowns de terceros, inhabilitando
 * equipos ya seleccionados en otros partidos (sin duplicados).
 */
function refreshThirdPlaceDropdowns(standings, teamMap, savedResults) {
  const selections = savedResults._thirdPlaceSelections || {};
  const usedTeamIds = new Set();
  Object.values(selections).forEach(tid => { if (tid) usedTeamIds.add(Number(tid)); });

  document.querySelectorAll('.third-place-select').forEach(select => {
    const matchId = Number(select.dataset.matchId);
    const currentId = Number(select.value);

    Array.from(select.options).forEach(option => {
      if (!option.value) return;
      const tid = Number(option.value);
      option.disabled = usedTeamIds.has(tid) && tid !== currentId;
    });
  });
}

/**
 * Intenta resolver la etiqueta de origen a un nombre de equipo.
 * Si la fuente es "WNN" (ganador partido NN) y ese partido ya tiene resultado,
 * devuelve el nombre del equipo ganador.
 * Si es "1A", "2B", etc., devuelve el equipo que ocupa esa posición.
 * Si es "3A/B/C/D/F" (tercer puesto), usa el mapa de Annex C si está disponible.
 */
function resolveSource(source, savedResults, bracket, standings, teamMap) {
  if (!source) return '?';

  // W73 → ganador del partido 73
  const winnerMatch = source.match(/^W(\d+)$/);
  if (winnerMatch) {
    const matchId = +winnerMatch[1];
    const saved = savedResults[matchId];
    return (saved && saved.played && saved.winner) ? `Gan. P${matchId} - ${saved.winner.split(' - ').pop()}` : `Gan. P${matchId}`;
  }

  // L101 → perdedor del partido 101
  const loserMatch = source.match(/^L(\d+)$/);
  if (loserMatch) {
    const matchId = +loserMatch[1];
    const saved = savedResults[matchId];
    return (saved && saved.played && saved.loser) ? `Per. P${matchId} - ${saved.loser.split(' - ').pop()}` : `Per. P${matchId}`;
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
 * Determina el matchId de un partido R32 a partir de su awaySource (3A/B/C/D/F, etc.)
 */
function resolveMatchIdFromSource(source) {
  // Mapear los awaySources de terceros a sus match IDs
  const AWAY_SOURCE_TO_MATCH = {
    '3A/B/C/D/F': 74, '3C/D/F/G/H': 77, '3C/E/F/H/I': 79,
    '3E/H/I/J/K': 80, '3B/E/F/I/J': 81, '3A/E/H/I/J': 82,
    '3E/F/G/I/J': 85, '3D/E/I/J/L': 87
  };
  return AWAY_SOURCE_TO_MATCH[source] || null;
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

  // Mostrar/ocultar penales cuando los marcadores son iguales
  container.addEventListener('input', e => {
    const input = e.target.closest('.ko-home-score, .ko-away-score');
    if (!input) return;

    const matchDiv = input.closest('.knockout-match');
    if (!matchDiv) return;
    const homeInput = matchDiv.querySelector('.ko-home-score');
    const awayInput = matchDiv.querySelector('.ko-away-score');
    const penSection = matchDiv.querySelector('.ko-penalties');

    if (homeInput && awayInput && penSection) {
      const hs = homeInput.value.trim();
      const as = awayInput.value.trim();
      if (hs !== '' && as !== '' && hs === as) {
        penSection.style.display = 'flex';
      } else {
        penSection.style.display = 'none';
      }
    }
  });

  // Cambio en selector de tercer puesto
  container.addEventListener('change', e => {
    const select = e.target.closest('.third-place-select');
    if (!select) return;

    const matchId = Number(select.dataset.matchId);
    const teamId = select.value ? Number(select.value) : null;

    if (!savedResults._thirdPlaceSelections) {
      savedResults._thirdPlaceSelections = {};
    }
    savedResults._thirdPlaceSelections[matchId] = teamId;
    saveToStorage('knockout', savedResults);

    refreshThirdPlaceDropdowns(standings, teamMap, savedResults);
  });

  // Guardar marcador
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
      alert('Los marcadores deben ser números enteros no negativos.');
      return;
    }

    const hs = parseInt(hsStr, 10);
    const as_ = parseInt(asStr, 10);

    const homeNameEl = matchDiv.querySelector('.ko-team.home .ko-team-name');
    const awayNameEl = matchDiv.querySelector('.ko-team.away .ko-team-name');
    const awaySelect = matchDiv.querySelector('.ko-team.away .third-place-select');

    const homeName = homeNameEl ? homeNameEl.textContent.trim().split(' - ').pop() : '?';
    let awayName = '?';
    if (awaySelect && awaySelect.value) {
      awayName = awaySelect.options[awaySelect.selectedIndex].textContent.trim().split(' - ').pop();
    } else if (awayNameEl) {
      awayName = awayNameEl.textContent.trim().split(' - ').pop();
    }

    let winner, loser;
    let penaltiesHome, penaltiesAway;

    if (hs > as_) {
      winner = homeName;
      loser = awayName;
    } else if (as_ > hs) {
      winner = awayName;
      loser = homeName;
    } else {
      const penHomeInput = matchDiv.querySelector('.ko-pen-home');
      const penAwayInput = matchDiv.querySelector('.ko-pen-away');
      const phStr = penHomeInput ? penHomeInput.value.trim() : '';
      const paStr = penAwayInput ? penAwayInput.value.trim() : '';

      if (phStr === '' || paStr === '' || isNaN(parseInt(phStr)) || isNaN(parseInt(paStr))) {
        alert('El partido terminó empatado. Ingresa el marcador de penales para determinar el ganador.');
        return;
      }

      penaltiesHome = parseInt(phStr, 10);
      penaltiesAway = parseInt(paStr, 10);

      if (penaltiesHome === penaltiesAway) {
        alert('Los penales no pueden quedar empatados. Debe haber un ganador.');
        return;
      }

      if (penaltiesHome > penaltiesAway) {
        winner = homeName;
        loser = awayName;
      } else {
        winner = awayName;
        loser = homeName;
      }
    }

    const result = {
      homeScore: hs, awayScore: as_,
      played: true,
      winner, loser
    };
    if (penaltiesHome !== undefined) {
      result.penaltiesHome = penaltiesHome;
      result.penaltiesAway = penaltiesAway;
    }

    savedResults[matchId] = result;

    saveToStorage('knockout', savedResults);
    matchDiv.classList.add('played');

    alert(`✅ Resultado guardado. Ganador: ${winner}`);

    // Re-renderizar para actualizar fuentes
    renderBracket(bracket, teamMap, savedResults, standings);
  });
}

function showKnockoutError(msg) {
  const c = document.getElementById('knockoutContainer');
  if (c) c.innerHTML = `<p class="error-text">⚠️ ${msg}</p>`;
}
