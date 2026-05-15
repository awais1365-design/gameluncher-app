import { BrowserWindow, ipcMain } from 'electron';
import * as http from 'http';
import {
  IPC_GAME_UPDATES,
  GameUpdateState,
  GameUpdateInfo,
  GameUpdatesSnapshot,
} from './gameUpdateTypes';
import { updaterLogger } from './logger';

// ─── Private types (internal to this module) ─────────────────────────────────

interface StoredInstalledGame {
  gameId: string;
  name: string;
  version: string;
  installPath: string;
  executable: string | null;
  installedAt: string;
}

interface BackendVersionEntry {
  version: string;
  url: string;
  size: number;
  createdAt: string;
}

interface BackendGame {
  _id: string;
  name: string;
  version: string;
  url: string;
  versions: BackendVersionEntry[];
}

// Minimal electron-store interface we actually need
interface IStore {
  get(key: string, defaultValue?: unknown): unknown;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class GameUpdateService {
  // First check 30 s after launch so startup isn't slowed down
  private static readonly INITIAL_DELAY_MS   = 30_000;
  // Re-check every 15 minutes while the app is open
  private static readonly CHECK_INTERVAL_MS  = 15 * 60 * 1_000;
  // Backend request timeout
  private static readonly REQUEST_TIMEOUT_MS = 8_000;

  private mainWindow: BrowserWindow | null = null;
  private checkTimer: ReturnType<typeof setInterval> | null = null;

  private snapshot: GameUpdatesSnapshot = {
    games:       {},
    lastChecked: null,
    isChecking:  false,
    isOnline:    true,
  };

  constructor(
    private readonly store: IStore,
    private readonly backendUrl: string,
  ) {
    this.registerIpcHandlers();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  startAutoCheck(): void {
    setTimeout(() => this.checkAllGames(), GameUpdateService.INITIAL_DELAY_MS);
    this.checkTimer = setInterval(
      () => this.checkAllGames(),
      GameUpdateService.CHECK_INTERVAL_MS,
    );
    updaterLogger.info('[GameUpdates] Auto-check scheduled', {
      initialDelayMs: GameUpdateService.INITIAL_DELAY_MS,
      intervalMs:     GameUpdateService.CHECK_INTERVAL_MS,
    });
  }

  stopAutoCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Called by main.cjs after install-game succeeds, to immediately reflect
   * the newly installed version without waiting for the next scheduled check.
   */
  handleGameInstalled(gameId: string): void {
    const installed = this.getInstalledGames();
    const game = installed[gameId];
    if (!game) return;

    const existing = this.snapshot.games[gameId];
    if (!existing?.info) return;

    // If the newly installed version satisfies the pending update, clear the badge
    if (!this.semverGt(existing.info.latestVersion, game.version)) {
      this.patchSnapshot({
        games: {
          ...this.snapshot.games,
          [gameId]: { gameId, status: 'up-to-date' },
        },
      });
      updaterLogger.info('[GameUpdates] Game marked up-to-date after install', {
        gameId,
        version: game.version,
      });
    }
  }

  getSnapshot(): GameUpdatesSnapshot {
    return { ...this.snapshot, games: { ...this.snapshot.games } };
  }

  // ─── Core check logic ──────────────────────────────────────────────────────

  async checkAllGames(): Promise<void> {
    if (this.snapshot.isChecking) {
      updaterLogger.debug('[GameUpdates] Skipped — check already in progress');
      return;
    }

    const installed = this.getInstalledGames();
    const gameIds = Object.keys(installed);

    if (gameIds.length === 0) {
      updaterLogger.debug('[GameUpdates] No installed games — nothing to check');
      return;
    }

    updaterLogger.info('[GameUpdates] Checking all installed games', { count: gameIds.length });
    this.patchSnapshot({ isChecking: true });

    try {
      const backendGames = await this.fetchGamesFromBackend();
      this.patchSnapshot({ isOnline: true });

      const updatedGames: Record<string, GameUpdateState> = { ...this.snapshot.games };

      for (const [gameId, installedGame] of Object.entries(installed)) {
        const backendGame = backendGames.find((g) => g._id === gameId);

        if (!backendGame) {
          // Game was deleted from backend — leave existing state untouched
          continue;
        }

        const latestEntry   = backendGame.versions?.[0];
        const latestVersion = latestEntry?.version ?? backendGame.version;
        const hasUpdate     = this.semverGt(latestVersion, installedGame.version);

        if (hasUpdate) {
          const info: GameUpdateInfo = {
            gameId,
            gameName:         installedGame.name,
            installedVersion: installedGame.version,
            latestVersion,
            downloadUrl:      latestEntry?.url  ?? backendGame.url,
            downloadSize:     latestEntry?.size ?? 0,
          };
          updatedGames[gameId] = { gameId, status: 'available', info };
          updaterLogger.info('[GameUpdates] Update found', {
            game: installedGame.name,
            from: installedGame.version,
            to:   latestVersion,
          });
        } else {
          updatedGames[gameId] = { gameId, status: 'up-to-date' };
        }
      }

      const updateCount = Object.values(updatedGames).filter((g) => g.status === 'available').length;
      updaterLogger.info('[GameUpdates] Check complete', {
        checked:      gameIds.length,
        updatesFound: updateCount,
      });

      this.patchSnapshot({
        games:       updatedGames,
        lastChecked: new Date().toISOString(),
        isChecking:  false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updaterLogger.warn('[GameUpdates] Check failed', { message });
      this.patchSnapshot({ isChecking: false, isOnline: false });
    }
  }

  async checkOneGame(gameId: string): Promise<void> {
    const installed    = this.getInstalledGames();
    const installedGame = installed[gameId];
    if (!installedGame) return;

    try {
      const backendGames = await this.fetchGamesFromBackend();
      const backendGame  = backendGames.find((g) => g._id === gameId);

      if (!backendGame) return;

      const latestEntry   = backendGame.versions?.[0];
      const latestVersion = latestEntry?.version ?? backendGame.version;
      const hasUpdate     = this.semverGt(latestVersion, installedGame.version);

      const newState: GameUpdateState = hasUpdate
        ? {
            gameId,
            status: 'available',
            info: {
              gameId,
              gameName:         installedGame.name,
              installedVersion: installedGame.version,
              latestVersion,
              downloadUrl:      latestEntry?.url  ?? backendGame.url,
              downloadSize:     latestEntry?.size ?? 0,
            },
          }
        : { gameId, status: 'up-to-date' };

      this.patchSnapshot({
        games:       { ...this.snapshot.games, [gameId]: newState },
        lastChecked: new Date().toISOString(),
        isOnline:    true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.patchSnapshot({
        games:    { ...this.snapshot.games, [gameId]: { gameId, status: 'error', error: message } },
        isOnline: false,
      });
    }
  }

  // ─── IPC Handlers ──────────────────────────────────────────────────────────

  private registerIpcHandlers(): void {
    ipcMain.handle(IPC_GAME_UPDATES.CHECK_ALL,    ()          => this.checkAllGames());
    ipcMain.handle(IPC_GAME_UPDATES.CHECK_ONE,    (_, gameId) => this.checkOneGame(gameId));
    ipcMain.handle(IPC_GAME_UPDATES.GET_SNAPSHOT, ()          => this.getSnapshot());
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private patchSnapshot(patch: Partial<GameUpdatesSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.broadcast(IPC_GAME_UPDATES.SNAPSHOT_CHANGED, this.snapshot);
  }

  private broadcast(channel: string, payload: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload);
    }
  }

  private getInstalledGames(): Record<string, StoredInstalledGame> {
    return (this.store.get('installedGames', {}) as Record<string, StoredInstalledGame>) ?? {};
  }

  private fetchGamesFromBackend(): Promise<BackendGame[]> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        `${this.backendUrl}/apps`,
        { timeout: GameUpdateService.REQUEST_TIMEOUT_MS },
        (res) => {
          let body = '';
          res.on('data', (chunk: string) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              return reject(new Error(`Backend returned HTTP ${res.statusCode}`));
            }
            try {
              resolve(JSON.parse(body) as BackendGame[]);
            } catch {
              reject(new Error('Backend returned invalid JSON'));
            }
          });
        },
      );
      req.on('error',   reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Backend request timed out'));
      });
    });
  }

  /** Returns true when semver a is strictly greater than semver b. */
  private semverGt(a: string, b: string): boolean {
    const parse = (v: string): [number, number, number] => {
      const [maj = 0, min = 0, pat = 0] = v.split('.').map((n) => parseInt(n, 10) || 0);
      return [maj, min, pat];
    };
    const [aMaj, aMin, aPat] = parse(a);
    const [bMaj, bMin, bPat] = parse(b);
    if (aMaj !== bMaj) return aMaj > bMaj;
    if (aMin !== bMin) return aMin > bMin;
    return aPat > bPat;
  }
}
