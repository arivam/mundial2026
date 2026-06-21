// js/betFormInit.js
// Manejo del formulario detallado de apuestas.

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = parseInt(urlParams.get('userId'));
  const betId = parseInt(urlParams.get('betId'));

  if (!userId || !betId) {
    alert('Acceso no válido.');
    window.location.href = 'users.html';
    return;
  }

  const ROOT = '../';
  let teams = [];
  try {
    teams = await loadData('teams', ROOT);
  } catch (err) {
    console.error(err);
    return;
  }

  let users = await loadFromStorage('users') || [];
  let bets = await loadFromStorage('bets') || [];

  // Normalizar IDs a número (en los JSON vienen como strings y los URL params
  // se convierten con parseInt, causando mismatch en comparaciones estrictas)
  users.forEach(u => u.id = Number(u.id));
  bets.forEach(b => { b.id = Number(b.id); b.userId = Number(b.userId); });

  // Sincronización con archivos JSON si el storage está vacío
  if (users.length === 0) try {
    users = await loadData('users', ROOT);
    users.forEach(u => u.id = Number(u.id));
  } catch(e) {}
  if (bets.length === 0) try {
    bets = await loadData('bets', ROOT);
    bets.forEach(b => { b.id = Number(b.id); b.userId = Number(b.userId); });
  } catch(e) {}

  const user = users.find(u => u.id === userId);
  const bet = bets.find(b => b.id === betId);

  if (!user || !bet) {
    alert('Datos no encontrados.');
    window.location.href = 'users.html';
    return;
  }

  // UI Displays
  document.getElementById('betLabelDisplay').textContent = `Apuesta: ${bet.betLabel}`;
  document.getElementById('userDetailsDisplay').textContent = `Usuario: ${user.name}`;

  // Rellenar selectores de equipos
  const populateSelect = (id, currentValue) => {
    const select = document.getElementById(id);
    teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      if (t.id === currentValue) opt.selected = true;
      select.appendChild(opt);
    });
  };

  populateSelect('selectChampion', bet.champion);
  populateSelect('selectRunnerUp', bet.runnerUp);
  populateSelect('selectThirdPlace', bet.thirdPlace);
  populateSelect('selectFourthPlace', bet.fourthPlace);

  // Generar checkboxes para fases (Simplificado para el ejemplo)
  const renderCheckboxes = (containerId, teamIds, limit) => {
    const container = document.getElementById(containerId);
    teams.forEach(t => {
      const wrapper = document.createElement('label');
      wrapper.className = 'checkbox-item';
      const isChecked = teamIds.includes(t.id);
      wrapper.innerHTML = `
        <input type="checkbox" name="${containerId}" value="${t.id}" ${isChecked ? 'checked' : ''}>
        <span>${t.name}</span>
      `;
      container.appendChild(wrapper);
    });

    // Control en tiempo real: evitar exceder el límite al hacer clic
    container.addEventListener('change', (e) => {
      const checkedCount = container.querySelectorAll('input[type="checkbox"]:checked').length;
      if (checkedCount > limit) {
        e.target.checked = false;
        alert(`No puedes seleccionar más de ${limit} equipos para esta fase.`);
      }
    });
  };

  renderCheckboxes('round32Container', bet.round32 || [], 32);
  renderCheckboxes('round16Container', bet.round16 || [], 16);
  renderCheckboxes('quarterfinalsContainer', bet.quarterfinals || [], 8);

  // Guardar cambios
  document.getElementById('betForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const getSelected = (name) => {
      return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
        .map(el => parseInt(el.value));
    };

    // Validaciones de límites (Casos de prueba de integridad)
    const r32 = getSelected('round32Container');
    const r16 = getSelected('round16Container');
    const rQ = getSelected('quarterfinalsContainer');

    if (r32.length !== 32) {
      alert(`Debes seleccionar exactamente 32 equipos para los Dieciseisavos (actual: ${r32.length}).`);
      return;
    }
    if (r16.length !== 16) {
      alert(`Debes seleccionar exactamente 16 equipos para los Octavos de Final (actual: ${r16.length}).`);
      return;
    }
    if (rQ.length !== 8) {
      alert(`Debes seleccionar exactamente 8 equipos para los Cuartos de Final (actual: ${rQ.length}).`);
      return;
    }

    const champ = parseInt(document.getElementById('selectChampion').value);
    const runner = parseInt(document.getElementById('selectRunnerUp').value);
    const third = parseInt(document.getElementById('selectThirdPlace').value);
    const fourth = parseInt(document.getElementById('selectFourthPlace').value);

    // Validar que se hayan seleccionado todos los puestos del podio (no menos de los requeridos)
    if (isNaN(champ) || isNaN(runner) || isNaN(third) || isNaN(fourth)) {
      alert('Debes seleccionar todos los equipos de la fase final (Campeón, Subcampeón, 3º y 4º puesto).');
      return;
    }

    // Validar integridad del podio (no duplicados)
    const podium = [champ, runner, third, fourth];
    if (new Set(podium).size !== 4) {
      alert('Un mismo equipo no puede ocupar más de una posición en el podio final.');
      return;
    }

    // Actualizar objeto
    bet.round32 = r32;
    bet.round16 = r16;
    bet.quarterfinals = rQ;
    bet.champion = champ;
    bet.runnerUp = runner;
    bet.thirdPlace = third;
    bet.fourthPlace = fourth;

    // Persistir
    const betIdx = bets.findIndex(b => b.id === betId);
    bets[betIdx] = bet;
    saveToStorage('bets', bets);

    alert('✅ Pronósticos guardados correctamente.');
    window.location.href = 'users.html';
  });
});