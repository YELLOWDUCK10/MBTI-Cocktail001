const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  loadFavorites: () => ipcRenderer.invoke('load-favorites'),
  saveFavorites: (favorites) => ipcRenderer.invoke('save-favorites', favorites),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  isElectron: true
});
