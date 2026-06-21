// js/usersInit.js
// Gestión de registro de usuarios y vinculación de apuestas.

document.addEventListener('DOMContentLoaded', async () => {
  const userForm = document.getElementById('userForm');
  const usersTableBody = document.querySelector('#usersTable tbody');
  const ROOT = '../';

  // Cargar datos iniciales
  let users = await loadFromStorage('users') || [];
  let bets = await loadFromStorage('bets') || [];

  // Normalizar IDs a número (en los JSON vienen como strings y los URL params
  // se convierten con parseInt, causando mismatch en comparaciones estrictas)
  users.forEach(u => u.id = Number(u.id));
  bets.forEach(b => { b.id = Number(b.id); b.userId = Number(b.userId); });

  let editingUserId = null;

  // Si no hay datos en storage (primera vez), se cargan de los JSON y se guardan en storage para iniciar el CRUD
  if (users.length === 0) {
    try { users = await loadData('users', ROOT); } catch(e) { users = []; console.log("Iniciando con usuarios vacíos"); }
    if (users.length > 0) {
      users.forEach(u => u.id = Number(u.id));
      saveToStorage('users', users);
    }
  }
  if (bets.length === 0) {
    try { bets = await loadData('bets', ROOT); } catch(e) { bets = []; console.log("Iniciando con apuestas vacías"); }
    if (bets.length > 0) {
      bets.forEach(b => { b.id = Number(b.id); b.userId = Number(b.userId); });
      saveToStorage('bets', bets);
    }
  }

  const renderUsers = () => {
    usersTableBody.innerHTML = '';
    if (users.length === 0) {
      usersTableBody.innerHTML = '<tr><td colspan="5" class="empty-text">No hay usuarios registrados.</td></tr>';
      return;
    }

    users.forEach(user => {
      const userBets = bets.filter(b => b.userId === user.id);
      const tr = document.createElement('tr');
      
      const betsHtml = userBets.map(bet => `
        <div class="bet-item-row">
          <span>${bet.betLabel}</span>
          <div class="bet-actions">
            <a href="bet-form.html?userId=${user.id}&betId=${bet.id}" class="btn-sm btn-link">✏️ Editar</a>
            <button class="btn-sm btn-link btn-delete-bet" data-bet-id="${bet.id}">🗑️ Eliminar</button>
          </div>
        </div>
      `).join('');

      tr.innerHTML = `
        <td>${user.id}</td>
        <td><strong>${user.name}</strong></td>
        <td>
          <small>${user.email || 'N/A'}<br>${user.phone || 'N/A'}</small>
        </td>
        <td>
          <span class="badge">${userBets.length} apuesta(s)</span>
          <div class="user-bets-list">
            ${betsHtml}
          </div>
          <button class="btn-sm btn-secondary btn-add-bet" data-id="${user.id}">+ Nueva</button>
        </td>
        <td>
          <button class="btn-sm btn-secondary btn-edit-user" data-id="${user.id}">Editar</button>
          <button class="btn-sm btn-danger btn-delete-user" data-id="${user.id}">Eliminar</button>
        </td>
      `;
      usersTableBody.appendChild(tr);
    });
  };

  // Registrar Usuario
  userForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const phone = document.getElementById('userPhone').value.trim();

    if (!name) {
      alert('El nombre es obligatorio.');
      return;
    }

    if (editingUserId) {
      const user = users.find(u => u.id === editingUserId);
      if (user) {
        user.name = name;
        user.email = email;
        user.phone = phone;
        saveToStorage('users', users);
        alert('✅ Usuario actualizado con éxito.');
      }
      editingUserId = null;
      userForm.querySelector('button[type="submit"]').textContent = 'Registrar Usuario';
    } else {
      const newUser = {
        id: Date.now(), // ID único basado en timestamp
        name,
        email,
        phone
      };
      users.push(newUser);
      saveToStorage('users', users);
      alert('✅ Usuario registrado con éxito.');
    }

    userForm.reset();
    renderUsers();
  });

  // Delegación de eventos para la tabla (Eliminar y Agregar Apuesta)
  usersTableBody.addEventListener('click', (e) => {
    // Caso: Eliminar Usuario
    if (e.target.classList.contains('btn-delete-user')) {
      const userId = parseInt(e.target.dataset.id);
      if (confirm('¿Estás seguro? Se eliminarán también todas sus apuestas.')) {
        users = users.filter(u => u.id !== userId);
        bets = bets.filter(b => b.userId !== userId); // Limpiar huérfanos

        if (editingUserId === userId) {
          editingUserId = null;
          userForm.reset();
          userForm.querySelector('button[type="submit"]').textContent = 'Registrar Usuario';
        }
        
        saveToStorage('users', users);
        saveToStorage('bets', bets);
        renderUsers();
      }
    }

    // Caso: Editar Usuario
    if (e.target.classList.contains('btn-edit-user')) {
      const userId = parseInt(e.target.dataset.id);
      const user = users.find(u => u.id === userId);
      if (user) {
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPhone').value = user.phone || '';
        editingUserId = user.id;
        userForm.querySelector('button[type="submit"]').textContent = 'Guardar Cambios';
        userForm.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Caso: Agregar Apuesta (Estructura inicial del Caso de prueba 7)
    if (e.target.classList.contains('btn-add-bet')) {
      const userId = parseInt(e.target.dataset.id);
      const user = users.find(u => u.id === userId);
      const betName = prompt(`Nombre para la nueva apuesta de ${user.name}:`, `Apuesta ${Date.now().toString().slice(-4)}`);
      
      if (betName) {
        const betId = Date.now();
        const newBet = {
          id: betId,
          userId: userId,
          betLabel: betName,
          round32: [],
          round16: [],
          quarterfinals: [],
          semifinals: [],
          final: [],
          champion: null,
          runnerUp: null,
          thirdPlace: null,
          fourthPlace: null,
          score: 0
        };
        
        bets.push(newBet);
        saveToStorage('bets', bets);
        window.location.href = `bet-form.html?userId=${userId}&betId=${betId}`;
      }
    }

    // Caso: Eliminar Apuesta independiente
    if (e.target.classList.contains('btn-delete-bet')) {
      const betId = parseInt(e.target.dataset.betId);
      if (confirm('¿Estás seguro de que deseas eliminar esta apuesta?')) {
        bets = bets.filter(b => b.id !== betId);
        saveToStorage('bets', bets);
        renderUsers();
      }
    }
  });

  // Render inicial
  renderUsers();
});