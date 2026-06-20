// indexInit.js
// This script populates the Teams and Groups tables on the home page.
// It respects the APP_MODE query parameter ("test" or "production").

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const APP_MODE = urlParams.get('mode') === 'test' ? 'test' : 'production';

  // Helper to fetch a JSON file respecting the mode
  const loadJson = (baseName) => {
    const suffix = APP_MODE === 'test' ? '_test' : '';
    const fileName = `${baseName}${suffix}.json`;
    return fetch(`../data/${fileName}`).then(r => {
      if (!r.ok) throw new Error(`Failed to load ${fileName}`);
      return r.json();
    });
  };

  // Populate Teams table
  loadJson('teams')
    .then(teams => {
      const tbody = document.querySelector('#teams-table tbody');
      if (!tbody) return;
      const rows = teams.map(team => {
        const tr = document.createElement('tr');
        const tdId = document.createElement('td');
        tdId.textContent = team.id;
        const tdName = document.createElement('td');
        tdName.textContent = team.name;
        tr.appendChild(tdId);
        tr.appendChild(tdName);
        return tr;
      });
      tbody.append(...rows);
    })
    .catch(err => console.error(err));

  // Populate Groups table
  loadJson('groups')
    .then(groups => {
      const tbody = document.querySelector('#groups-table tbody');
      if (!tbody) return;
      const rows = groups.map(group => {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.textContent = group.name;
        const tdTeams = document.createElement('td');
        // group.teamIds is an array of IDs – join them with commas
        tdTeams.textContent = (group.teamIds || []).join(', ');
        tr.appendChild(tdName);
        tr.appendChild(tdTeams);
        return tr;
      });
      tbody.append(...rows);
    })
    .catch(err => console.error(err));
});
