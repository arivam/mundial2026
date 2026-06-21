// js/statisticsInit.js
// Inicialización de pages/statistics.html.
// Muestra estadísticas del torneo: resumen de partidos, goles por grupo
// y posición general. No requiere Chart.js (tabla HTML pura).

document.addEventListener('DOMContentLoaded', async () => {
  const ROOT = '../';

  let teams, groups, matches;

  try {
    [teams, groups, matches] = await Promise.all([
      loadData('teams', ROOT),
      loadData('groups', ROOT),
      loadData('matches', ROOT)
    ]);
  } catch (err) {
    console.error('Error cargando estadísticas:', err);
    showError('No se pudieron cargar los datos.');
    return;
  }

  // Restaurar marcadores desde localStorage
  const savedMatches = await loadFromStorage('matches');
  if (savedMatches) {
    savedMatches.forEach(saved => {
      const m = matches.find(x => x.id === saved.id);
      if (m) {
        m.homeScore = saved.homeScore;
        m.awayScore = saved.awayScore;
        m.played = saved.played;
      }
    });
  }

  const teamMap = {};
  teams.forEach(t => { teamMap[t.id] = t; });

  // Cargar datos de usuarios y apuestas (desde storage o JSON inicial)
  let users = await loadFromStorage('users') || [];
  let bets = await loadFromStorage('bets') || [];

  if (users.length === 0) {
    try { users = await loadData('users', ROOT); } catch(e) {}
    if (users.length > 0) saveToStorage('users', users);
  }
  if (bets.length === 0) {
    try { bets = await loadData('bets', ROOT); } catch(e) {}
    if (bets.length > 0) saveToStorage('bets', bets);
  }

  const knockoutResults = await loadFromStorage('knockout') || {};
  let bracket = {};
  try {
    bracket = await loadData('knockout', ROOT);
  } catch (e) {
    console.warn('No se pudo cargar el bracket para el ranking');
  }

  // Calcular equipos reales en cada fase
  const actualTeams = calculateActualTeams(groups, matches, teamMap, bracket, knockoutResults);

  renderSummary(matches);
  renderGoalsByGroup(groups, matches, teamMap);
  renderTopScorers(groups, matches, teamMap);
  renderRankingTable(users, bets, actualTeams);
  renderRankingChart(users, bets, actualTeams);
  setupExport(users, bets, actualTeams);
});

/* ────────────── Resumen general ────────────── */

function renderSummary(matches) {
  const el = document.getElementById('summarySection');
  if (!el) return;

  const played = matches.filter(m => m.played);
  const totalGoals = played.reduce((s, m) => s + (m.homeScore || 0) + (m.awayScore || 0), 0);
  const avgGoals = played.length > 0 ? (totalGoals / played.length).toFixed(2) : 0;

  el.innerHTML = `
    <div class="stats-summary-grid">
      <div class="stat-card">
        <div class="stat-value">${matches.length}</div>
        <div class="stat-label">Partidos totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${played.length}</div>
        <div class="stat-label">Partidos jugados</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalGoals}</div>
        <div class="stat-label">Goles totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${avgGoals}</div>
        <div class="stat-label">Promedio goles/partido</div>
      </div>
    </div>
  `;
}

/* ────────────── Goles por grupo ────────────── */

function renderGoalsByGroup(groups, matches, teamMap) {
  const el = document.getElementById('goalsByGroupSection');
  if (!el) return;

  const rows = groups.map(g => {
    const gMatches = matches.filter(m => {
      const matchGroup = m.group || (teamMap[m.homeTeamId] ? teamMap[m.homeTeamId].group : null);
      return matchGroup === g.name && m.played;
    });
    
    const goals = gMatches.reduce((s, m) => s + (m.homeScore || 0) + (m.awayScore || 0), 0);
    return { group: g.name, played: gMatches.length, goals };
  });

  const tbody = rows.map(r =>
    `<tr><td>Grupo ${r.group}</td><td>${r.played}</td><td>${r.goals}</td><td>${r.played > 0 ? (r.goals / r.played).toFixed(1) : '-'}</td></tr>`
  ).join('');

  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>Grupo</th><th>Partidos jugados</th><th>Total goles</th><th>Prom. goles/partido</th></tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

/* ────────────── Equipos con más goles ────────────── */

function renderTopScorers(groups, matches, teamMap) {
  const el = document.getElementById('topScorerSection');
  if (!el) return;

  // Acumular goles por equipo
  const scorerMap = {};
  matches.filter(m => m.played).forEach(m => {
    if (!scorerMap[m.homeTeamId]) scorerMap[m.homeTeamId] = 0;
    if (!scorerMap[m.awayTeamId]) scorerMap[m.awayTeamId] = 0;
    scorerMap[m.homeTeamId] += m.homeScore || 0;
    scorerMap[m.awayTeamId] += m.awayScore || 0;
  });

  const sorted = Object.entries(scorerMap)
    .map(([id, goals]) => ({ team: teamMap[+id], goals }))
    .filter(x => x.team)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 10);

  if (sorted.length === 0) {
    el.innerHTML = '<p class="empty-text">No hay partidos jugados aún.</p>';
    return;
  }

  const tbody = sorted.map((r, i) =>
    `<tr>
      <td>${i + 1}</td>
      <td><img src="${r.team.flagUrl || ''}" alt="${r.team.name}" class="team-flag-sm"></td>
      <td>${r.team.name}</td>
      <td><span class="badge-group">Grupo ${r.team.group}</span></td>
      <td class="goals-count">${r.goals}</td>
    </tr>`
  ).join('');

  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>#</th><th></th><th>Equipo</th><th>Grupo</th><th>Goles</th></tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

/* ────────────── Ranking de Usuarios ────────────── */

/**
 * Calcula qué equipos están realmente en cada fase del torneo.
 */
function calculateActualTeams(groups, matches, teamMap, bracket, knockoutResults) {
  const actual = {
    r32: [], r16: [], rQF: [], rSF: [], rF: [],
    champion: null, runnerUp: null, thirdPlace: null, fourthPlace: null
  };

  // 1. Clasificados R32 (Fase de Grupos)
  const standings = calculateStandings(groups, matches, teamMap);
  const thirds = [];
  Object.values(standings).forEach(groupStandings => {
    // Solo clasificar si el grupo ha tenido actividad real (PJ > 0)
    if (groupStandings[0] && groupStandings[0].played > 0) actual.r32.push(groupStandings[0].teamId);
    if (groupStandings[1] && groupStandings[1].played > 0) actual.r32.push(groupStandings[1].teamId);
    if (groupStandings[2] && groupStandings[2].played > 0) thirds.push({ ...groupStandings[2] });
  });
  // Mejores terceros (8)
  thirds.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
  thirds.slice(0, 8).forEach(t => actual.r32.push(t.teamId));

  const findIdByName = (name) => {
    if (!name) return null;
    // Limpiar nombres con prefijo de origen o ganador 
    // (ej: "1A - Mexico" -> "Mexico" o "Gan. P73 - Czechia" -> "Czechia")
    const cleaned = name.includes(' - ') ? name.split(' - ').pop().trim() : name.trim();
    return Object.values(teamMap).find(t => t.name === cleaned)?.id;
  };

  // 2. Ganadores de llaves (Fases Eliminatorias)
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

  // Posiciones finales
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

function calculateBetScore(bet, actual) {
  const score = { r32: 0, r16: 0, rQF: 0, rSF: 0, rF: 0, fourth: 0, third: 0, runnerUp: 0, champion: 0, total: 0 };
  const hits = (betList, actualList) => (betList || []).filter(id => id && (actualList || []).includes(id)).length;

  // Puntos por fase
  score.r32 = hits(bet.round32, actual.r32) * 5;
  score.r16 = hits(bet.round16, actual.r16) * 10;
  score.rQF = hits(bet.quarterfinals, actual.rQF) * 20;
  
  // Derivación de SF y Finalistas (los que quedaron en el podio llegaron a esas fases)
  const predictedSF = [bet.champion, bet.runnerUp, bet.thirdPlace, bet.fourthPlace].filter(id => id);
  const predictedF = [bet.champion, bet.runnerUp].filter(id => id);
  
  score.rSF = hits(predictedSF, actual.rSF) * 30;
  score.rF = hits(predictedF, actual.rF) * 40;

  // Posiciones exactas
  if (bet.fourthPlace && actual.fourthPlace && bet.fourthPlace === actual.fourthPlace) score.fourth = 40;
  if (bet.thirdPlace && actual.thirdPlace && bet.thirdPlace === actual.thirdPlace) score.third = 50;
  if (bet.runnerUp && actual.runnerUp && bet.runnerUp === actual.runnerUp) score.runnerUp = 60;
  if (bet.champion && actual.champion && bet.champion === actual.champion) score.champion = 70;

  score.total = Object.values(score).reduce((a, b) => a + b, 0);
  return score;
}

function renderRankingTable(users, bets, actualTeams) {
  const tbody = document.querySelector('#rankingTable tbody');
  if (!tbody) return;

  const ranking = bets.map(bet => {
    const user = users.find(u => u.id === bet.userId);
    return {
      name: user ? user.name : 'Anónimo',
      label: bet.betLabel,
      score: calculateBetScore(bet, actualTeams)
    };
  }).sort((a, b) => b.score.total - a.score.total);

  tbody.innerHTML = ranking.map((r, i) => `
    <tr${i < 3 ? ' class="top-three"' : ''}>
      <td class="pos-cell">${i + 1}</td>
      <td><strong>${r.name}</strong><br><small>${r.label}</small></td>
      <td>${r.score.r32}</td>
      <td>${r.score.r16}</td>
      <td>${r.score.rQF}</td>
      <td>${r.score.rSF}</td>
      <td>${r.score.rF}</td>
      <td>${r.score.fourth}</td>
      <td>${r.score.third}</td>
      <td>${r.score.runnerUp}</td>
      <td>${r.score.champion}</td>
      <td><strong>${r.score.total}</strong></td>
    </tr>
  `).join('');
}

function renderRankingChart(users, bets, actualTeams) {
  const canvas = document.getElementById('rankingChart');
  if (!canvas || typeof Chart === 'undefined') {
    if (canvas) canvas.style.display = 'none';
    return;
  }

  const data = bets.map(bet => {
    const user = users.find(u => u.id === bet.userId);
    return {
      label: `${user ? user.name : 'Anónimo'} (${bet.betLabel})`,
      total: calculateBetScore(bet, actualTeams).total
    };
  }).sort((a, b) => b.total - a.total).slice(0, 5);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: 'Puntos Totales',
        data: data.map(d => d.total),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

function setupExport(users, bets, actualTeams) {
  // CSV
  const csvBtn = document.getElementById('exportCsv');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      const header = "Usuario,Apuesta,R32,R16,QF,SF,F,4o,3o,Sub,Camp,Total\n";
      const csv = bets.map(bet => {
        const user = users.find(u => u.id === bet.userId);
        const s = calculateBetScore(bet, actualTeams);
        return `"${user ? user.name : 'Anónimo'}","${bet.betLabel}",${s.r32},${s.r16},${s.rQF},${s.rSF},${s.rF},${s.fourth},${s.third},${s.runnerUp},${s.champion},${s.total}`;
      }).join("\n");

      const blob = new Blob([header + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "ranking_polla_2026.csv");
      link.click();
    });
  }

  // PDF
  const pdfBtn = document.getElementById('exportPdf');
  if (pdfBtn && typeof jspdf !== 'undefined') {
    pdfBtn.addEventListener('click', () => {
      const { jsPDF } = jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFontSize(16);
      doc.text('Ranking Polla Mundial 2026', 14, 15);

      doc.setFontSize(9);
      doc.text(`Generado: ${new Date().toLocaleString('es')}`, 14, 22);

      const ranking = bets.map(bet => {
        const user = users.find(u => u.id === bet.userId);
        const s = calculateBetScore(bet, actualTeams);
        return [
          user ? user.name : 'Anónimo',
          bet.betLabel,
          s.r32, s.r16, s.rQF, s.rSF, s.rF,
          s.fourth, s.third, s.runnerUp, s.champion,
          s.total
        ];
      }).sort((a, b) => b[11] - a[11]);

      doc.autoTable({
        startY: 26,
        head: [['#', 'Usuario', 'Apuesta', 'R32', 'R16', 'QF', 'SF', 'F', '4º', '3º', 'Sub', 'Camp', 'Total']],
        body: ranking.map((r, i) => [i + 1, ...r]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 248, 250] },
        columnStyles: {
          0: { cellWidth: 10 },
          12: { fontStyle: 'bold' }
        }
      });

      doc.save('ranking_polla_2026.pdf');
    });
  }
}

/**
 * Calcula posiciones de grupos (utilizado para R32).
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

function showError(msg) {
  ['summarySection', 'goalsByGroupSection', 'topScorerSection'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<p class="error-text">⚠️ ${msg}</p>`;
  });
}
