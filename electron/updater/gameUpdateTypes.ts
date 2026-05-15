// ─── Game Update Status ───────────────────────────────────────────────────────
// Deliberately separate from UpdaterState — this is a detection-only status.
// Actual download progress lives in the existing DownloadState (LauncherContext).

export type GameUpdateStatus =
  | 'idle'        // not yet checked
  | 'up-to-date'  // checked, nothing to do
  | 'available'   // new version exists on server
  | 'error';      // check failed for this game

// ─── Data Shapes ─────────────────────────────────────────────────────────────

export interface GameUpdateInfo {
  gameId: string;
  gameName: string;
  installedVersion: string;
  latestVersion: string;
  downloadUrl: string;
  downloadSize: number;
}

export interface GameUpdateState {
  gameId: string;
  status: GameUpdateStatus;
  info?: GameUpdateInfo;
  error?: string;
}

/**
 * Full snapshot pushed to the renderer on every state change.
 * Renderer replaces its entire gameUpdates slice with this object.
 */
export interface GameUpdatesSnapshot {
  games: Record<string, GameUpdateState>;
  lastChecked: string | null;  // ISO timestamp
  isChecking: boolean;
  isOnline: boolean;
}

// ─── IPC Channel Constants ────────────────────────────────────────────────────

export const IPC_GAME_UPDATES = {
  CHECK_ALL:        'game-updates:check-all',
  CHECK_ONE:        'game-updates:check-one',
  GET_SNAPSHOT:     'game-updates:get-snapshot',
  SNAPSHOT_CHANGED: 'game-updates:snapshot-changed',
} as const;
