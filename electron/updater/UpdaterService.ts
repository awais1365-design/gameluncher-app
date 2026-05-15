import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC_UPDATER, UpdaterState, UpdateVersionInfo, UpdateProgress } from './types';
import { updaterLogger } from './logger';

export class UpdaterService {
  // Check 10 s after launch — avoids slowing the cold-start experience
  private static readonly INITIAL_CHECK_DELAY_MS = 10_000;
  // Re-check every 4 hours while the app is open
  private static readonly AUTO_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1_000;

  private mainWindow: BrowserWindow | null = null;
  private updateDownloaded = false;
  private autoCheckTimer: ReturnType<typeof setInterval> | null = null;

  private state: UpdaterState = {
    status: 'idle',
    currentVersion: app.getVersion(),
  };

  constructor() {
    this.configure();
    this.bindEvents();
    this.registerIpcHandlers();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Must be called after the main BrowserWindow is created. */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Schedules an initial check after INITIAL_CHECK_DELAY_MS, then repeats
   * every AUTO_CHECK_INTERVAL_MS. Call once from app.whenReady().
   */
  startAutoCheck(): void {
    setTimeout(() => this.checkForUpdates(), UpdaterService.INITIAL_CHECK_DELAY_MS);
    this.autoCheckTimer = setInterval(
      () => this.checkForUpdates(),
      UpdaterService.AUTO_CHECK_INTERVAL_MS,
    );
    updaterLogger.info('Auto-check scheduled', {
      initialDelayMs: UpdaterService.INITIAL_CHECK_DELAY_MS,
      intervalMs:     UpdaterService.AUTO_CHECK_INTERVAL_MS,
    });
  }

  stopAutoCheck(): void {
    if (this.autoCheckTimer) {
      clearInterval(this.autoCheckTimer);
      this.autoCheckTimer = null;
    }
  }

  async checkForUpdates(): Promise<void> {
    if (this.state.status === 'checking' || this.state.status === 'downloading') {
      updaterLogger.debug('Check skipped — already in progress', { status: this.state.status });
      return;
    }

    // SIMULATE_UPDATE=1 → fires a fake update-available event for local UI testing
    // without needing a published GitHub Release.
    if (process.env.SIMULATE_UPDATE === '1') {
      updaterLogger.info('Simulation mode — firing fake update-available in 3 s');
      this.applyState({ status: 'checking', error: undefined });
      setTimeout(() => {
        this.applyState({
          status: 'available',
          info: {
            version:      '99.0.0',
            releaseDate:  new Date().toISOString(),
            releaseName:  'Simulated Release',
            releaseNotes: 'Fake update for local UI testing.',
          },
          progress: undefined,
          error:    undefined,
        });
      }, 3_000);
      return;
    }

    // Never hit GitHub from a dev build — no published artifact to find
    if (process.env.ELECTRON_ENV === 'development') {
      updaterLogger.info('Skipping update check in development mode');
      return;
    }

    try {
      updaterLogger.info('Checking for updates');
      await autoUpdater.checkForUpdates();
    } catch (err) {
      this.handleError('checkForUpdates', err);
    }
  }

  async downloadUpdate(): Promise<void> {
    if (this.state.status !== 'available') {
      updaterLogger.warn('downloadUpdate called in wrong state', { status: this.state.status });
      return;
    }
    try {
      updaterLogger.info('Downloading update', { version: this.state.info?.version });
      await autoUpdater.downloadUpdate();
    } catch (err) {
      this.handleError('downloadUpdate', err);
    }
  }

  /**
   * Quits the app and runs the installer.
   * - Windows: launches the NSIS installer (UAC prompt if needed).
   * - macOS:   moves the new app into place and relaunches.
   */
  quitAndInstall(): void {
    if (!this.updateDownloaded) {
      updaterLogger.warn('quitAndInstall called before download completed');
      return;
    }
    updaterLogger.info('Quitting and installing update');
    // isSilent=false  → shows native installer UI on Windows
    // isForceRunAfter → relaunches the app automatically after install
    autoUpdater.quitAndInstall(false, true);
  }

  getState(): UpdaterState {
    return { ...this.state };
  }

  // ─── Configuration ──────────────────────────────────────────────────────────

  private configure(): void {
    // We gate download behind a user prompt — never download without consent
    autoUpdater.autoDownload = false;

    // If user closes the app after a completed download, install silently on next launch
    autoUpdater.autoInstallOnAppQuit = true;

    // Production builds only — no pre-releases, no downgrades
    autoUpdater.allowPrerelease  = false;
    autoUpdater.allowDowngrade   = false;

    // Provide a GitHub token to avoid anonymous rate-limiting (60 req/hr)
    // For private repos this is mandatory.
    if (process.env.GH_TOKEN) {
      autoUpdater.addAuthHeader(`token ${process.env.GH_TOKEN}`);
    }

    updaterLogger.info('AutoUpdater configured', {
      currentVersion: app.getVersion(),
      platform: process.platform,
      arch:     process.arch,
    });
  }

  // ─── electron-updater Event Bindings ────────────────────────────────────────

  private bindEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      updaterLogger.info('Checking for update…');
      this.applyState({ status: 'checking', error: undefined });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      updaterLogger.info('Update available', {
        latest:      info.version,
        current:     app.getVersion(),
        releaseDate: info.releaseDate,
      });
      this.applyState({
        status:   'available',
        info:     this.mapVersionInfo(info),
        progress: undefined,
        error:    undefined,
      });
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      updaterLogger.info('Already on latest version', { version: info.version });
      this.applyState({
        status:   'not-available',
        info:     undefined,
        progress: undefined,
        error:    undefined,
      });
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      updaterLogger.debug('Download progress', { percent: Math.round(progress.percent) });
      this.applyState({
        status:   'downloading',
        progress: this.mapProgress(progress),
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.updateDownloaded = true;
      updaterLogger.info('Update downloaded — ready to install', { version: info.version });
      this.applyState({
        status:   'downloaded',
        info:     this.mapVersionInfo(info),
        progress: undefined,
      });
    });

    // electron-updater fires (err, message?) — message is the human-readable string
    autoUpdater.on('error', (err: Error, message?: string) => {
      const errorMessage = message ?? err.message;
      updaterLogger.error('AutoUpdater error', { message: errorMessage, stack: err.stack });
      this.applyState({ status: 'error', error: errorMessage });
    });
  }

  // ─── IPC Handlers ──────────────────────────────────────────────────────────

  private registerIpcHandlers(): void {
    ipcMain.handle(IPC_UPDATER.CHECK,     () => this.checkForUpdates());
    ipcMain.handle(IPC_UPDATER.DOWNLOAD,  () => this.downloadUpdate());
    ipcMain.handle(IPC_UPDATER.INSTALL,   () => this.quitAndInstall());
    ipcMain.handle(IPC_UPDATER.GET_STATE, () => this.getState());
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private applyState(patch: Partial<UpdaterState>): void {
    this.state = { ...this.state, ...patch };
    this.broadcast(IPC_UPDATER.STATE_CHANGED, this.state);
  }

  private broadcast(channel: string, payload: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload);
    }
  }

  private handleError(context: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    updaterLogger.error(`${context} failed`, { message });
    this.applyState({ status: 'error', error: message });
  }

  private mapVersionInfo(info: UpdateInfo): UpdateVersionInfo {
    return {
      version:      info.version,
      releaseDate:  info.releaseDate,
      releaseName:  info.releaseName ?? undefined,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
    };
  }

  private mapProgress(p: ProgressInfo): UpdateProgress {
    return {
      bytesPerSecond: p.bytesPerSecond,
      percent:        p.percent,
      transferred:    p.transferred,
      total:          p.total,
    };
  }
}
