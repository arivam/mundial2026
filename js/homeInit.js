// js/homeInit.js
// Inicialización de la página de inicio (index.html en la raíz).
// Carga teams.json y groups.json y renderiza el resumen de grupos y equipos.

document.addEventListener('DOMContentLoaded', async () => {
  // Config está disponible globalmente desde config.js
  const ROOT = ''; // index.html está en la raíz; data/ también está en la raíz

  try {
    const [teams, groups] = await Promise.all([
      loadData('teams', ROOT),
      loadData('groups', ROOT)
    ]);

    // Mapa de equipos por id para búsqueda rápida
    const teamMap = {};
    teams.forEach(t => { teamMap[t.id] = t; });

    renderGroupsGrid(groups, teamMap);
    renderTeamsGrid(teams);
    setupDataCenter();
  } catch (err) {
    console.error('Error cargando datos de inicio:', err);
    document.getElementById('groupsGrid').innerHTML =
      '<p class="error-text">⚠️ No se pudieron cargar los datos. Verifica que el servidor esté activo.</p>';
  }
});

/**
 * Configura los botones de exportación e importación en la Home.
 */
function setupDataCenter() {
  const btnExport = document.getElementById('btnExport');
  const inputFile = document.getElementById('importFile');

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      exportTournamentData();
    });
  }

  if (inputFile) {
    inputFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        importTournamentData(event.target.result);
      };
      reader.readAsText(file);
    });
  }
}

/**
 * Renderiza las tarjetas de grupos con sus equipos.
 * @param {Array} groups
 * @param {Object} teamMap
 */
function renderGroupsGrid(groups, teamMap) {
  const container = document.getElementById('groupsGrid');
  if (!container) return;

  container.innerHTML = '';
  groups.forEach(group => {
    const card = document.createElement('div');
    card.className = 'group-card';

    const title = document.createElement('h3');
    title.textContent = `Grupo ${group.name}`;
    card.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'group-team-list';

    (group.teamIds || []).forEach(id => {
      const team = teamMap[id];
      if (!team) return;
      const li = document.createElement('li');
      li.className = 'group-team-item';

      const flag = document.createElement('img');
      flag.src = team.flagUrl || '';
      flag.alt = team.name;
      flag.className = 'team-flag-sm';
      flag.loading = 'lazy';

      const name = document.createElement('span');
      name.textContent = team.name;

      li.appendChild(flag);
      li.appendChild(name);
      list.appendChild(li);
    });

    card.appendChild(list);
    container.appendChild(card);
  });
}

/**
 * Renderiza la cuadrícula de todos los equipos participantes.
 * @param {Array} teams
 */
function renderTeamsGrid(teams) {
  const container = document.getElementById('teamsGrid');
  if (!container) return;

  container.innerHTML = '';

  // Ordenar alfabéticamente por nombre de equipo
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Bandera</th>
        <th>Nombre del equipo</th>
        <th>Grupo</th>
      </tr>
    </thead>
    <tbody>
      ${sortedTeams.map(team => `
        <tr>
          <td><img src="${team.flagUrl || ''}" alt="${team.name}" class="team-flag-sm" loading="lazy"></td>
          <td style="text-align: left; font-weight: 500;">${team.name}</td>
          <td>Grupo ${team.group}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  container.appendChild(table);
}
