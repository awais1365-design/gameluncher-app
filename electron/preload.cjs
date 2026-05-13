const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  /* Window */
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  /* Data */
  fetchGames:   () => ipcRenderer.invoke('fetch-games'),
  getInstalled: () => ipcRenderer.invoke('get-installed'),

  /* Actions */
  installGame:   (data)   => ipcRenderer.invoke('install-game', data),
  uninstallGame: (gameId) => ipcRenderer.invoke('uninstall-game', gameId),
  launchGame:    (data)   => ipcRenderer.invoke('launch-game', data),

  /* Settings */
  getSettings:    ()         => ipcRenderer.invoke('get-settings'),
  saveSettings:   (settings) => ipcRenderer.invoke('save-settings', settings),
  browseInstallDir: ()       => ipcRenderer.invoke('browse-install-dir'),

  /* Events (returns unsubscribe fn) */
  onDownloadProgress: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  onInstallStatus: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('install-status', handler);
    return () => ipcRenderer.removeListener('install-status', handler);
  },
});
