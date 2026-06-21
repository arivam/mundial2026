// js/groupStageInit.js
// Inicialización de pages/group-stage.html.
// Carga teams.json, groups.json, matches.json y standings.json del servidor
// y renderiza la tabla de grupos con el fixture. Los cambios de marcador se
// persisten en localStorage (el servidor estático no admite escritura).

document.addEventListener('DOMContentLoaded', async () => {
  // config.js expone: loadData(baseName, root), APP_MODE
  // Desde pages/ la carpeta data/ está un nivel arriba
  const ROOT = '../';

  let teams = [], groups = [], matches = [];

  try {
    [teams, groups, matches] = await Promise.all([
      loadData('teams', ROOT),
      loadData('groups', ROOT),
      loadData('matches', ROOT)
    ]);
  } catch (err) {
    console.error('Error cargando datos:', err);
    showError('No se pudieron cargar los datos del torneo.');
    return;
  }

  // Restaurar marcadores guardados en localStorage
  const savedMatches = await loadFromStorage('matches');
  if (savedMatches) {
    // Combinar scores guardados con la estructura original
    savedMatches.forEach(saved => {
      const m = matches.find(x => x.id === saved.id);
      if (m) {
        m.homeScore = saved.homeScore;
        m.awayScore = saved.awayScore;
        m.played = saved.played;
      }
    });
  }

  // Construir mapas de referencia
  const teamMap = buildTeamMap(teams);
  const standingsMap = buildStandingsMap(groups, matches, teamMap);

  renderGroupTables(groups, teamMap, standingsMap, matches);
  renderFixture(groups, matches, teamMap);
});

let fixtureListenerAdded = false;

/* ────────────── Construcción de estructuras ────────────── */

function buildTeamMap(teams) {
  const map = {};
  teams.forEach(t => { map[t.id] = t; });
  return map;
}

/**
 * Calcula las posiciones de cada equipo a partir de los partidos jugados.
 * Devuelve un mapa: groupName → [ { teamId, played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, points } ]
 */
function buildStandingsMap(groups, matches, teamMap) {
  // Inicializar mapa a partir de la estructura de grupos definida en groups.json
  const map = {}; // groupName → { teamId: stats }

  groups.forEach(group => {
    map[group.name] = {};
    (group.teamIds || []).forEach(id => {
      map[group.name][id] = {
        teamId: id,
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
      };
    });
  });

  // Procesar partidos jugados
  matches.forEach(m => {
    if (!m.played || m.homeScore === null || m.awayScore === null) return;
    // Intentar obtener el grupo del partido o del equipo local si no está definido
    let g = m.group;
    if (!g && teamMap[m.homeTeamId]) {
      g = teamMap[m.homeTeamId].group;
    }
    
    if (!map[g]) return;
    const home = map[g][m.homeTeamId];
    const away = map[g][m.awayTeamId];
    if (!home || !away) return;

    const hs = m.homeScore, as_ = m.awayScore;
    home.played++; away.played++;
    home.goalsFor += hs; home.goalsAgainst += as_;
    away.goalsFor += as_; away.goalsAgainst += hs;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (hs > as_) {
      home.wins++; home.points += 3;
      away.losses++;
    } else if (as_ > hs) {
      away.wins++; away.points += 3;
      home.losses++;
    } else {
      home.draws++; home.points++;
      away.draws++; away.points++;
    }
  });

  // Ordenar por puntos → diferencia de gol → goles a favor
  Object.keys(map).forEach(g => {
    map[g] = Object.values(map[g]).sort((a, b) =>
      b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
    );
  });

  return map;
}

/* ────────────── Renderizado ────────────── */

function renderGroupTables(groups, teamMap, standingsMap, matches) {
  const container = document.getElementById('groupsContainer');
  if (!container) return;
  container.innerHTML = '';

  groups.forEach(group => {
    const gName = group.name;
    const standings = standingsMap[gName] || [];

    const section = document.createElement('section');
    section.className = 'group-section';

    const caption = document.createElement('h3');
    caption.className = 'group-caption';
    caption.textContent = `Grupo ${gName}`;
    section.appendChild(caption);

    const table = document.createElement('table');
    table.className = 'group-table';

    // Cabecera
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Pos</th><th colspan="2">Equipo</th><th title="Partidos Jugados">PJ</th><th title="Victorias">V</th><th title="Empates">E</th><th title="Derrotas">D</th><th title="Goles a favor">GF</th><th title="Goles en contra">GC</th><th title="Diferencia de goles">DG</th><th title="Puntos">Pts</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    standings.forEach((row, idx) => {
      const team = teamMap[row.teamId];
      if (!team) return;
      const tr = document.createElement('tr');
      if (idx < 2) tr.classList.add('qualified');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><img src="${team.flagUrl || ''}" alt="${team.name}" class="team-flag-sm" loading="lazy"></td>
        <td class="team-name-cell">${team.name}</td>
        <td>${row.played}</td>
        <td>${row.wins}</td>
        <td>${row.draws}</td>
        <td>${row.losses}</td>
        <td>${row.goalsFor}</td>
        <td>${row.goalsAgainst}</td>
        <td>${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}</td>
        <td class="points-cell">${row.points}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  });
}

function renderFixture(groups, matches, teamMap) {
  const container = document.getElementById('fixtureContainer');
  if (!container) return;
  
  // Limpiar contenedor
  container.innerHTML = '<h2>📅 Calendario de Partidos</h2>';

  // Organizar partidos por grupo y jornada
  groups.forEach(group => {
    const gName = group.name;
    // Filtro: por propiedad 'group' o deducción por equipo
    const groupMatches = matches.filter(m => {
      if (m.group === gName) return true;
      const homeTeam = teamMap[m.homeTeamId];
      return homeTeam && homeTeam.group === gName;
    });

    if (groupMatches.length === 0) return;

    const groupSection = document.createElement('section');
    groupSection.className = 'fixture-group';

    const title = document.createElement('h3');
    title.className = 'fixture-group-title';
    title.textContent = `Grupo ${gName}`;
    groupSection.appendChild(title);

    // Agrupar por jornada
    const byMatchday = {};
    groupMatches.forEach(m => {
      const day = m.matchday || 1;
      if (!byMatchday[day]) byMatchday[day] = [];
      byMatchday[day].push(m);
    });

    Object.keys(byMatchday).sort((a, b) => +a - +b).forEach(day => {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'matchday';

      const dayTitle = document.createElement('h4');
      dayTitle.className = 'matchday-title';
      dayTitle.textContent = `Jornada ${day}`;
      dayDiv.appendChild(dayTitle);

      byMatchday[day].forEach(match => {
        const homeTeam = teamMap[match.homeTeamId];
        const awayTeam = teamMap[match.awayTeamId];
        if (!homeTeam || !awayTeam) return;

        const matchDiv = document.createElement('div');
        matchDiv.className = `match-item${match.played ? ' played' : ''}`;
        matchDiv.dataset.matchId = match.id;

        matchDiv.innerHTML = `
          <div class="match-team home-team">
            <img src="${homeTeam.flagUrl || ''}" alt="${homeTeam.name}" class="team-flag-sm" loading="lazy">
            <span>${homeTeam.name}</span>
          </div>
          <div class="match-score">
            <input type="number" class="score-input home-score" min="0" max="99"
              value="${match.homeScore !== null ? match.homeScore : ''}"
              placeholder="-" data-match-id="${match.id}" data-side="home">
            <span class="score-separator">:</span>
            <input type="number" class="score-input away-score" min="0" max="99"
              value="${match.awayScore !== null ? match.awayScore : ''}"
              placeholder="-" data-match-id="${match.id}" data-side="away">
          </div>
          <div class="match-team away-team">
            <span>${awayTeam.name}</span>
            <img src="${awayTeam.flagUrl || ''}" alt="${awayTeam.name}" class="team-flag-sm" loading="lazy">
          </div>
          <button class="btn-save-score" data-match-id="${match.id}">💾 Guardar</button>
        `;

        dayDiv.appendChild(matchDiv);
      });

      groupSection.appendChild(dayDiv);
    });

    container.appendChild(groupSection);
  });

  // Eventos para guardar marcadores
  if (!fixtureListenerAdded) {
    container.addEventListener('click', e => {
    const btn = e.target.closest('.btn-save-score');
    if (!btn) return;
    const matchId = +btn.dataset.matchId;
    const matchDiv = container.querySelector(`[data-match-id="${matchId}"]`);
    const homeInput = matchDiv.querySelector('.home-score');
    const awayInput = matchDiv.querySelector('.away-score');

    const hsStr = homeInput.value.trim();
    const asStr = awayInput.value.trim();

    if (hsStr === '' || asStr === '' || isNaN(parseInt(hsStr)) || isNaN(parseInt(asStr))) {
      alert('Los marcadores deben ser números enteros no negativos.');
      return;
    }

    // Actualizar en el array de matches
    const match = matches.find(m => m.id === matchId);
    if (match) {
      match.homeScore = parseInt(hsStr, 10);
      match.awayScore = parseInt(asStr, 10);
      match.played = true;
      matchDiv.classList.add('played');
    }

    // Persistir en localStorage
    saveToStorage('matches', matches.map(m => ({
      id: m.id, homeScore: m.homeScore, awayScore: m.awayScore, played: m.played
    })));

    // Recalcular standings y refrescar tablas UI inmediatamente
    const updatedStandingsMap = buildStandingsMap(groups, matches, teamMap);
    renderGroupTables(groups, teamMap, updatedStandingsMap, matches);

    alert('✅ Marcador guardado.');
  });
    fixtureListenerAdded = true;
  }
}

function showError(msg) {
  const containers = ['groupsContainer', 'fixtureContainer'];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<p class="error-text">⚠️ ${msg}</p>`;
  });
}
