// ─── Game Types ───────────────────────────────────────────────────────────────

export type GameVersion = {
  version: string;
  url: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

export type Game = {
  _id: string;
  name: string;
  url: string;
  version: string;
  versions: GameVersion[];
  createdAt: string;
  updatedAt: string;
};

export type InstalledGame = {
  gameId: string;
  name: string;
  version: string;
  installPath: string;
  executable: string | null;
  installedAt: string;
};

export type DownloadState = {
  gameId: string;
  gameName: string;
  version: string;
  percent: number;
  received: number;
  total: number;
  status: 'downloading' | 'installing' | 'done' | 'error';
  error?: string;
};

export type Settings = {
  installDir: string;
};

export type View = 'library' | 'store' | 'downloads' | 'settings';

// ─── Launcher Auto-Update Types ───────────────────────────────────────────────
// Mirrors electron/updater/types.ts — kept separate so renderer has no
// dependency on Electron main-process modules.

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export type UpdateVersionInfo = {
  version: string;
  releaseDate: string;
  releaseName?: string;
  releaseNotes?: string;
};

export type UpdateProgress = {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
};

export type UpdaterState = {
  status: UpdateStatus;
  currentVersion: string;
  info?: UpdateVersionInfo;
  progress?: UpdateProgress;
  error?: string;
};

// ─── Game Update Detection Types ──────────────────────────────────────────────
// Mirrors electron/updater/gameUpdateTypes.ts.
// Detection only — download progress is tracked separately in DownloadState.

export type GameUpdateStatus = 'idle' | 'up-to-date' | 'available' | 'error';

export type GameUpdateInfo = {
  gameId: string;
  gameName: string;
  installedVersion: string;
  latestVersion: string;
  downloadUrl: string;
  downloadSize: number;
};

export type GameUpdateState = {
  gameId: string;
  status: GameUpdateStatus;
  info?: GameUpdateInfo;
  error?: string;
};

export type GameUpdatesSnapshot = {
  games: Record<string, GameUpdateState>;
  lastChecked: string | null;
  isChecking: boolean;
  isOnline: boolean;
};

// ─── window.launcher IPC Bridge ──────────────────────────────────────────────

declare global {
  interface Window {
    launcher: {
      /* Window */
      minimize: () => void;
      maximize: () => void;
      close:    () => void;

      /* Data */
      fetchGames:   () => Promise<Game[]>;
      getInstalled: () => Promise<Record<string, InstalledGame>>;

      /* Game Actions */
      installGame: (data: {
        gameId: string;
        gameName: string;
        versionUrl: string;
        version: string;
      }) => Promise<InstalledGame>;
      uninstallGame: (gameId: string) => Promise<{ success: boolean }>;
      launchGame:    (data: {
        installPath: string;
        executable: string | null;
      }) => Promise<string>;

      /* Settings */
      getSettings:      () => Promise<Settings>;
      saveSettings:     (s: Partial<Settings>) => Promise<{ success: boolean }>;
      browseInstallDir: () => Promise<string | null>;

      /* Game Download Events */
      onDownloadProgress: (
        cb: (data: { gameId: string; percent: number; received: number; total: number }) => void
      ) => () => void;
      onInstallStatus: (
        cb: (data: { gameId: string; status: string }) => void
      ) => () => void;

      /* Launcher Auto-Update */
      updater: {
        checkForUpdates: () => Promise<void>;
        downloadUpdate:  () => Promise<void>;
        install:         () => Promise<void>;
        getState:        () => Promise<UpdaterState>;
        onStateChanged:  (cb: (state: UpdaterState) => void) => () => void;
      };

      /* Game Update Detection */
      gameUpdates: {
        checkAll:          () => Promise<void>;
        checkOne:          (gameId: string) => Promise<void>;
        getSnapshot:       () => Promise<GameUpdatesSnapshot>;
        onSnapshotChanged: (cb: (snapshot: GameUpdatesSnapshot) => void) => () => void;
      };
    };
  }
}
