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

/* ─── window.launcher type ───────────────────────────── */

declare global {
  interface Window {
    launcher: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;

      fetchGames: () => Promise<Game[]>;
      getInstalled: () => Promise<Record<string, InstalledGame>>;

      installGame: (data: {
        gameId: string;
        gameName: string;
        versionUrl: string;
        version: string;
      }) => Promise<InstalledGame>;
      uninstallGame: (gameId: string) => Promise<{ success: boolean }>;
      launchGame: (data: {
        installPath: string;
        executable: string | null;
      }) => Promise<string>;

      getSettings: () => Promise<Settings>;
      saveSettings: (s: Partial<Settings>) => Promise<{ success: boolean }>;
      browseInstallDir: () => Promise<string | null>;

      onDownloadProgress: (
        cb: (data: { gameId: string; percent: number; received: number; total: number }) => void
      ) => () => void;
      onInstallStatus: (
        cb: (data: { gameId: string; status: string }) => void
      ) => () => void;
    };
  }
}
