const { contextBridge, ipcRenderer } = require('electron');

// ─── IPC channel constants ────────────────────────────────────────────────────
// Must stay in sync with electron/updater/types.ts and gameUpdateTypes.ts.
// Duplicated here (no import in a preload CJS file) so the renderer-facing
// bridge has no dependency on the main-process module tree.

const IPC_UPDATER = {
  CHECK:         'updater:check',
  DOWNLOAD:      'updater:download',
  INSTALL:       'updater:install',
  GET_STATE:     'updater:get-state',
  STATE_CHANGED: 'updater:state-changed',
};

const IPC_GAME_UPDATES = {
  CHECK_ALL:        'game-updates:check-all',
  CHECK_ONE:        'game-updates:check-one',
  GET_SNAPSHOT:     'game-updates:get-snapshot',
  SNAPSHOT_CHANGED: 'game-updates:snapshot-changed',
};

contextBridge.exposeInMainWorld('launcher', {
  /* ── Window ─────────────────────────────────────────── */
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  /* ── Data ───────────────────────────────────────────── */
  fetchGames:   () => ipcRenderer.invoke('fetch-games'),
  getInstalled: () => ipcRenderer.invoke('get-installed'),

  /* ── Game Actions ───────────────────────────────────── */
  installGame:   (data)   => ipcRenderer.invoke('install-game', data),
  uninstallGame: (gameId) => ipcRenderer.invoke('uninstall-game', gameId),
  launchGame:    (data)   => ipcRenderer.invoke('launch-game', data),

  /* ── Settings ───────────────────────────────────────── */
  getSettings:      ()         => ipcRenderer.invoke('get-settings'),
  saveSettings:     (settings) => ipcRenderer.invoke('save-settings', settings),
  browseInstallDir: ()         => ipcRenderer.invoke('browse-install-dir'),

  /* ── Game Download Events (returns unsubscribe fn) ───── */
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

  /* ── Launcher Auto-Update ───────────────────────────── */
  updater: {
    checkForUpdates: () => ipcRenderer.invoke(IPC_UPDATER.CHECK),
    downloadUpdate:  () => ipcRenderer.invoke(IPC_UPDATER.DOWNLOAD),
    install:         () => ipcRenderer.invoke(IPC_UPDATER.INSTALL),
    getState:        () => ipcRenderer.invoke(IPC_UPDATER.GET_STATE),
    onStateChanged: (cb) => {
      const handler = (_e, state) => cb(state);
      ipcRenderer.on(IPC_UPDATER.STATE_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_UPDATER.STATE_CHANGED, handler);
    },
  },

  /* ── Game Update Detection ──────────────────────────── */
  gameUpdates: {
    /** Trigger an immediate check of all installed games. */
    checkAll: () => ipcRenderer.invoke(IPC_GAME_UPDATES.CHECK_ALL),

    /** Trigger an immediate check for a single game. */
    checkOne: (gameId) => ipcRenderer.invoke(IPC_GAME_UPDATES.CHECK_ONE, gameId),

    /** Returns the current GameUpdatesSnapshot. */
    getSnapshot: () => ipcRenderer.invoke(IPC_GAME_UPDATES.GET_SNAPSHOT),

    /**
     * Subscribe to real-time snapshot pushes from the main process.
     * @returns unsubscribe function — call it in useEffect cleanup.
     */
    onSnapshotChanged: (cb) => {
      const handler = (_e, snapshot) => cb(snapshot);
      ipcRenderer.on(IPC_GAME_UPDATES.SNAPSHOT_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_GAME_UPDATES.SNAPSHOT_CHANGED, handler);
    },
  },
});
