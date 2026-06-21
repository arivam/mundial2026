(function (global) {
  const params = new URLSearchParams(window.location.search);
  global.APP_MODE = params.get('mode') === 'test' ? 'test' : 'production';

  const hasApi = typeof global.api !== 'undefined' && global.api;

  global.dataPath = function (baseName, root = '') {
    const suffix = global.APP_MODE === 'test' ? '_test' : '';
    return `${root}data/${baseName}${suffix}.json`;
  };

  global.loadData = async function (baseName, root = '') {
    if (hasApi) {
      if (baseName === 'knockout') {
        return await global.api.getData('knockout');
      }
      return await global.api.getData(baseName);
    }
    const url = global.dataPath(baseName, root);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`No se pudo cargar ${url}`);
      return await r.json();
    } catch (e) {
      console.warn('loadData fetch failed, trying XHR:', e.message);
    }
    try {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = () => {
          if (xhr.status === 0 || xhr.status === 200) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch (err) { reject(err); }
          } else {
            reject(new Error(`XHR failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('XHR error'));
        xhr.send();
      });
    } catch (e) {
      console.warn('loadData XHR fallback also failed:', e.message);
      return null;
    }
  };

  global.saveToStorage = function (key, value) {
    if (hasApi) {
      global.api.saveData(key, value);
      return;
    }
    try {
      localStorage.setItem(`${key}_${global.APP_MODE}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Error en localStorage:', e);
    }
  };

  global.loadFromStorage = async function (key) {
    if (hasApi) {
      if (key === 'matches') return null;
      if (key === 'knockout') {
        return await global.api.getData('knockout-results');
      }
      const data = await global.api.getData(key);
      return data;
    }
    try {
      const raw = localStorage.getItem(`${key}_${global.APP_MODE}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  global.exportTournamentData = function () {
    if (hasApi) {
      global.api.exportAll().then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        document.body.appendChild(a);
        a.href = url;
        a.download = 'backup_polla_2026.json';
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      return;
    }
    const keys = ['matches', 'knockout', 'users', 'bets'];
    const backup = {};
    keys.forEach(k => { backup[k] = global.loadFromStorage(k); });
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

  global.importTournamentData = function (jsonString) {
    if (hasApi) {
      global.api.importAll(jsonString).then(result => {
        if (result.success) {
          alert('Datos importados correctamente. La página se recargará.');
          window.location.reload();
        } else {
          alert('Error al importar el archivo. Verifica el formato.');
        }
      });
      return;
    }
    try {
      const data = JSON.parse(jsonString);
      Object.entries(data).forEach(([key, value]) => {
        if (value) global.saveToStorage(key, value);
      });
      alert('Datos importados correctamente. La página se recargará.');
      window.location.reload();
    } catch (e) {
      console.error('Error en la importación:', e);
      alert('Error al importar el archivo. Verifica el formato.');
    }
  };
})(window);
