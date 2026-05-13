const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

let win;
let store;

const BACKEND_URL = 'http://localhost:3000';

async function loadStore() {
  const { default: Store } = await import('electron-store');
  store = new Store();
}

function getInstallDir() {
  return store?.get('installDir', path.join(app.getPath('userData'), 'games'));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 780,
    minWidth: 1000,
    minHeight: 640,
    frame: false,
    backgroundColor: '#0e1821',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await loadStore();
  createWindow();
});

app.on('window-all-closed', () => app.quit());

/* ─── Window Controls ─────────────────────────────────── */

ipcMain.on('window-minimize', () => win?.minimize());
ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.on('window-close', () => win?.close());

/* ─── Fetch Games from Backend ───────────────────────── */

ipcMain.handle('fetch-games', () => {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const req = http.get(`${BACKEND_URL}/apps`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(5000, () => { req.destroy(); resolve([]); });
  });
});

/* ─── Installed Games (electron-store) ───────────────── */

ipcMain.handle('get-installed', () => {
  return store?.get('installedGames', {}) ?? {};
});

/* ─── Settings ───────────────────────────────────────── */

ipcMain.handle('get-settings', () => ({
  installDir: getInstallDir(),
}));

ipcMain.handle('save-settings', (_, settings) => {
  if (settings.installDir) store?.set('installDir', settings.installDir);
  return { success: true };
});

ipcMain.handle('browse-install-dir', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Install Directory',
  });
  if (!result.canceled && result.filePaths[0]) return result.filePaths[0];
  return null;
});

/* ─── Install Game ───────────────────────────────────── */

ipcMain.handle('install-game', async (event, { gameId, gameName, versionUrl, version }) => {
  const installDir = getInstallDir();
  const gameDir = path.join(installDir, gameId);

  if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });

  const downloadUrl = /^https?:\/\//.test(versionUrl)
    ? versionUrl
    : `https://${versionUrl}`;

  const fileName = path.basename(new URL(downloadUrl).pathname) || 'game.zip';
  const downloadPath = path.join(app.getPath('temp'), `${gameId}-${fileName}`);

  // Download via Electron session
  await new Promise((resolve, reject) => {
    win.webContents.session.once('will-download', (e, item) => {
      item.setSavePath(downloadPath);

      item.on('updated', (_e, state) => {
        if (state === 'progressing') {
          const total = item.getTotalBytes();
          const received = item.getReceivedBytes();
          const percent = total > 0 ? Math.round((received / total) * 100) : 0;
          event.sender.send('download-progress', { gameId, percent, received, total });
        }
      });

      item.once('done', (_e, state) => {
        if (state === 'completed') resolve();
        else reject(new Error(`Download ${state}`));
      });
    });

    win.webContents.downloadURL(downloadUrl);
  });

  event.sender.send('install-status', { gameId, status: 'installing' });

  // Extract / copy
  await new Promise((resolve, reject) => {
    if (fileName.endsWith('.zip')) {
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(downloadPath);
        zip.extractAllTo(gameDir, true);
        resolve();
      } catch (e) {
        reject(e);
      }
    } else if (fileName.endsWith('.tar.xz') || fileName.endsWith('.tar.gz')) {
      const flag = fileName.endsWith('.tar.xz') ? 'J' : 'z';
      exec(`tar -x${flag}f "${downloadPath}" -C "${gameDir}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      fs.copyFileSync(downloadPath, path.join(gameDir, fileName));
      resolve();
    }
  });

  try { fs.unlinkSync(downloadPath); } catch {}

  const executable = findExecutable(gameDir);
  const installed = store?.get('installedGames', {}) ?? {};

  installed[gameId] = {
    gameId,
    name: gameName,
    version,
    installPath: gameDir,
    executable,
    installedAt: new Date().toISOString(),
  };

  store?.set('installedGames', installed);
  return installed[gameId];
});

/* ─── Uninstall Game ─────────────────────────────────── */

ipcMain.handle('uninstall-game', (_, gameId) => {
  const installed = store?.get('installedGames', {}) ?? {};
  const game = installed[gameId];

  if (game && fs.existsSync(game.installPath)) {
    fs.rmSync(game.installPath, { recursive: true, force: true });
  }

  delete installed[gameId];
  store?.set('installedGames', installed);
  return { success: true };
});

/* ─── Launch Game ────────────────────────────────────── */

ipcMain.handle('launch-game', (_, { installPath, executable }) => {
  const target = executable || installPath;
  const cmd =
    process.platform === 'darwin' ? `open "${target}"` :
    process.platform === 'win32'  ? `start "" "${target}"` :
    `"${target}"`;

  return new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err.message);
      else resolve('launched');
    });
  });
});

/* ─── Helpers ────────────────────────────────────────── */

function findExecutable(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);

  const macApp = files.find((f) => f.endsWith('.app'));
  if (macApp) return path.join(dir, macApp);

  const winExe = files.find((f) => f.endsWith('.exe'));
  if (winExe) return path.join(dir, winExe);

  const linBin = files.find((f) => {
    try { return fs.statSync(path.join(dir, f)).mode & 0o111; }
    catch { return false; }
  });
  if (linBin) return path.join(dir, linBin);

  return dir;
}
