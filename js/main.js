// main.js
// Load JSON data and handle theme toggle

document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle
  const themeBtn = document.getElementById('themeBtn');
  const currentTheme = localStorage.getItem('theme') || 'light';
  setTheme(currentTheme);
  themeBtn.addEventListener('click', () => {
    const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    setTheme(newTheme);
  });

  // Determine app mode from URL
  const urlParams = new URLSearchParams(window.location.search);
  const APP_MODE = (urlParams.get('mode') === 'test') ? 'test' : 'production';

  // Load JSON data (example: teams)
  loadJson('teams', APP_MODE);
});

function setTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeBtn').textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    document.getElementById('themeBtn').textContent = '🌙';
  }
  localStorage.setItem('theme', theme);
}

function loadJson(baseName, mode) {
  const fileSuffix = mode === 'test' ? '_test' : '';
  const fileName = `${baseName}${fileSuffix}.json`;
  fetch(`../data/${fileName}`)
    .then(response => response.ok ? response.json() : Promise.reject('Failed to load'))
    .then(data => {
      const pre = document.getElementById('jsonData');
      if (pre) {
        pre.textContent = JSON.stringify(data, null, 2);
      }
    })
    .catch(err => {
      console.error(err);
      const pre = document.getElementById('jsonData');
      if (pre) {
        pre.textContent = 'Error loading data';
      }
    });
}
