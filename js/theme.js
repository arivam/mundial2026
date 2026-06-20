// js/theme.js
// Gestión del tema oscuro/claro. Se incluye en todas las páginas.

(function () {
  const STORAGE_KEY = 'mundial2026_theme';

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      const btn = document.getElementById('themeBtn');
      if (btn) btn.textContent = '☀️';
    } else {
      document.body.classList.remove('dark-mode');
      const btn = document.getElementById('themeBtn');
      if (btn) btn.textContent = '🌙';
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // Aplicar tema guardado antes de que el DOM esté listo para evitar flash
  const saved = localStorage.getItem(STORAGE_KEY) || 'light';
  applyTheme(saved);

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    // Re-apply to update button text after DOM is ready
    applyTheme(localStorage.getItem(STORAGE_KEY) || 'light');
    btn.addEventListener('click', () => {
      const current = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  });
})();
