// js/config.js
// Configuración centralizada: modo de la app (producción vs test).
// El modo se determina a partir del parámetro ?mode=test en la URL.

(function (global) {
  const params = new URLSearchParams(window.location.search);
  global.APP_MODE = params.get('mode') === 'test' ? 'test' : 'production';

  /**
   * Devuelve la ruta correcta a un archivo JSON en /data,
   * añadiendo el sufijo _test si el modo es 'test'.
   * @param {string} baseName  Nombre base del archivo (sin extensión, sin sufijo)
   * @param {string} [root='']  Prefijo de ruta relativo al documento actual
   * @returns {string} ruta completa al .json
   */
  global.dataPath = function (baseName, root = '') {
    const suffix = global.APP_MODE === 'test' ? '_test' : '';
    return `${root}data/${baseName}${suffix}.json`;
  };

  /**
   * Fetch wrapper que carga un JSON del directorio /data.
   * @param {string} baseName  Nombre base del archivo (sin extensión, sin sufijo)
   * @param {string} [root=''] Prefijo de ruta relativo al documento actual
   * @returns {Promise<any>}
   */
  global.loadData = function (baseName, root = '') {
    const url = global.dataPath(baseName, root);
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${url} (${r.status})`);
      return r.json();
    });
  };

  /**
   * Guarda datos en localStorage con el sufijo de modo.
   * @param {string} key
   * @param {any} value
   */
  global.saveToStorage = function (key, value) {
    try {
      localStorage.setItem(`${key}_${global.APP_MODE}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Error en localStorage:', e);
    }
  };

  /**
   * Carga datos de localStorage considerando el modo actual.
   * @param {string} key
   */
  global.loadFromStorage = function (key) {
    try {
      const raw = localStorage.getItem(`${key}_${global.APP_MODE}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  /**
   * Agrupa todos los datos de localStorage y los descarga como un archivo JSON.
   */
  global.exportTournamentData = function () {
    const keys = ['matches', 'knockout', 'users', 'bets'];
    const backup = {};
    keys.forEach(k => {
      backup[k] = global.loadFromStorage(k);
    });

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.href = url;
    a.download = `backup_polla_2026_${global.APP_MODE}.json`;
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Recibe un string JSON y restaura los datos en localStorage.
   * @param {string} jsonString
   */
  global.importTournamentData = function (jsonString) {
    try {
      const data = JSON.parse(jsonString);
      Object.entries(data).forEach(([key, value]) => {
        if (value) global.saveToStorage(key, value);
      });
      return true;
    } catch (e) {
      console.error('Error en la importación:', e);
      return false;
    }
  };
})(window);
