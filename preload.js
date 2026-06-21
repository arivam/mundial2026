const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getData: (key) => ipcRenderer.invoke('db:getData', key),
  saveData: (key, value) => ipcRenderer.invoke('db:saveData', key, value),
  exportAll: () => ipcRenderer.invoke('db:exportAll'),
  importAll: (data) => ipcRenderer.invoke('db:importAll', data),
  resetDatabase: () => ipcRenderer.invoke('db:reset'),
});
