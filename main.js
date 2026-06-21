const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { initDatabase, getData, saveData, resetDatabase } = require('./js/electron-db');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    title: 'Polla Mundial 2026',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  initDatabase(app);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('db:getData', async (_event, key) => {
  return getData(key);
});

ipcMain.handle('db:saveData', async (_event, key, value) => {
  return saveData(key, value);
});

ipcMain.handle('db:exportAll', async () => {
  const data = {
    teams: getData('teams'),
    groups: getData('groups'),
    matches: getData('matches'),
    knockout: getData('knockout'),
    users: getData('users'),
    bets: getData('bets'),
    knockoutResults: getData('knockout-results')
  };
  return data;
});

ipcMain.handle('db:importAll', async (_event, jsonData) => {
  try {
    const data = JSON.parse(jsonData);
    for (const [key, value] of Object.entries(data)) {
      if (key === 'knockout') {
        saveData('knockout-bracket', value);
      } else if (key === 'knockoutResults') {
        saveData('knockout-results', value);
      } else {
        saveData(key, value);
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:reset', async () => {
  resetDatabase(app);
  return { success: true };
});
