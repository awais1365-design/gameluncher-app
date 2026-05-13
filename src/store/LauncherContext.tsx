import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { Game, InstalledGame, DownloadState, Settings, View } from '../types';

/* ─── State ──────────────────────────────────────────── */

type State = {
  games: Game[];
  installed: Record<string, InstalledGame>;
  downloads: Record<string, DownloadState>;
  settings: Settings;
  view: View;
  gamesLoading: boolean;
  gamesError: string | null;
};

type Action =
  | { type: 'SET_GAMES'; payload: Game[] }
  | { type: 'SET_GAMES_LOADING'; payload: boolean }
  | { type: 'SET_GAMES_ERROR'; payload: string | null }
  | { type: 'SET_INSTALLED'; payload: Record<string, InstalledGame> }
  | { type: 'SET_VIEW'; payload: View }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'DOWNLOAD_PROGRESS'; payload: { gameId: string; percent: number; received: number; total: number } }
  | { type: 'INSTALL_STATUS'; payload: { gameId: string; status: string } }
  | { type: 'START_DOWNLOAD'; payload: { gameId: string; gameName: string; version: string } }
  | { type: 'DOWNLOAD_DONE'; payload: { gameId: string; installed: InstalledGame } }
  | { type: 'DOWNLOAD_ERROR'; payload: { gameId: string; error: string } }
  | { type: 'REMOVE_DOWNLOAD'; payload: string };

const initial: State = {
  games: [],
  installed: {},
  downloads: {},
  settings: { installDir: '' },
  view: 'library',
  gamesLoading: true,
  gamesError: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_GAMES':
      return { ...state, games: action.payload, gamesLoading: false, gamesError: null };
    case 'SET_GAMES_LOADING':
      return { ...state, gamesLoading: action.payload };
    case 'SET_GAMES_ERROR':
      return { ...state, gamesError: action.payload, gamesLoading: false };
    case 'SET_INSTALLED':
      return { ...state, installed: action.payload };
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'START_DOWNLOAD': {
      const { gameId, gameName, version } = action.payload;
      return {
        ...state,
        downloads: {
          ...state.downloads,
          [gameId]: { gameId, gameName, version, percent: 0, received: 0, total: 0, status: 'downloading' },
        },
      };
    }
    case 'DOWNLOAD_PROGRESS': {
      const dl = state.downloads[action.payload.gameId];
      if (!dl) return state;
      return {
        ...state,
        downloads: {
          ...state.downloads,
          [action.payload.gameId]: { ...dl, ...action.payload, status: 'downloading' },
        },
      };
    }
    case 'INSTALL_STATUS': {
      const dl = state.downloads[action.payload.gameId];
      if (!dl) return state;
      return {
        ...state,
        downloads: {
          ...state.downloads,
          [action.payload.gameId]: { ...dl, status: 'installing' },
        },
      };
    }
    case 'DOWNLOAD_DONE': {
      const dl = state.downloads[action.payload.gameId];
      return {
        ...state,
        installed: { ...state.installed, [action.payload.gameId]: action.payload.installed },
        downloads: dl
          ? { ...state.downloads, [action.payload.gameId]: { ...dl, status: 'done', percent: 100 } }
          : state.downloads,
      };
    }
    case 'DOWNLOAD_ERROR': {
      const dl = state.downloads[action.payload.gameId];
      if (!dl) return state;
      return {
        ...state,
        downloads: {
          ...state.downloads,
          [action.payload.gameId]: { ...dl, status: 'error', error: action.payload.error },
        },
      };
    }
    case 'REMOVE_DOWNLOAD': {
      const next = { ...state.downloads };
      delete next[action.payload];
      return { ...state, downloads: next };
    }
    default:
      return state;
  }
}

/* ─── Context ────────────────────────────────────────── */

type CtxValue = State & {
  setView: (v: View) => void;
  refreshGames: () => void;
  installGame: (game: Game) => void;
  uninstallGame: (gameId: string) => void;
  launchGame: (gameId: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  clearDownload: (gameId: string) => void;
};

const Ctx = createContext<CtxValue>(null!);

export function LauncherProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const activeDownloads = useRef<Set<string>>(new Set());

  /* Boot */
  useEffect(() => {
    refreshGames();
    loadInstalled();
    loadSettings();

    const unsubProgress = window.launcher.onDownloadProgress((data) => {
      dispatch({ type: 'DOWNLOAD_PROGRESS', payload: data });
    });
    const unsubStatus = window.launcher.onInstallStatus((data) => {
      dispatch({ type: 'INSTALL_STATUS', payload: data });
    });

    return () => {
      unsubProgress();
      unsubStatus();
    };
  }, []);

  function refreshGames() {
    dispatch({ type: 'SET_GAMES_LOADING', payload: true });
    window.launcher.fetchGames()
      .then((games) => dispatch({ type: 'SET_GAMES', payload: games }))
      .catch(() => dispatch({ type: 'SET_GAMES_ERROR', payload: 'Could not reach backend (localhost:3000)' }));
  }

  function loadInstalled() {
    window.launcher.getInstalled().then((data) =>
      dispatch({ type: 'SET_INSTALLED', payload: data })
    );
  }

  function loadSettings() {
    window.launcher.getSettings().then((s) =>
      dispatch({ type: 'SET_SETTINGS', payload: s })
    );
  }

  async function installGame(game: Game) {
    if (activeDownloads.current.has(game._id)) return;

    const latestVersion = game.versions?.[0];
    if (!latestVersion) return;

    activeDownloads.current.add(game._id);
    dispatch({
      type: 'START_DOWNLOAD',
      payload: { gameId: game._id, gameName: game.name, version: latestVersion.version },
    });
    dispatch({ type: 'SET_VIEW', payload: 'downloads' });

    try {
      const installed = await window.launcher.installGame({
        gameId: game._id,
        gameName: game.name,
        versionUrl: latestVersion.url,
        version: latestVersion.version,
      });
      dispatch({ type: 'DOWNLOAD_DONE', payload: { gameId: game._id, installed } });
    } catch (e: any) {
      dispatch({ type: 'DOWNLOAD_ERROR', payload: { gameId: game._id, error: String(e) } });
    } finally {
      activeDownloads.current.delete(game._id);
    }
  }

  async function uninstallGame(gameId: string) {
    await window.launcher.uninstallGame(gameId);
    loadInstalled();
  }

  async function launchGame(gameId: string) {
    const info = state.installed[gameId];
    if (!info) return;
    await window.launcher.launchGame({ installPath: info.installPath, executable: info.executable });
  }

  async function updateSettings(s: Partial<Settings>) {
    await window.launcher.saveSettings(s);
    loadSettings();
  }

  function clearDownload(gameId: string) {
    dispatch({ type: 'REMOVE_DOWNLOAD', payload: gameId });
  }

  return (
    <Ctx.Provider value={{
      ...state,
      setView: (v) => dispatch({ type: 'SET_VIEW', payload: v }),
      refreshGames,
      installGame,
      uninstallGame,
      launchGame,
      updateSettings,
      clearDownload,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLauncher = () => useContext(Ctx);
