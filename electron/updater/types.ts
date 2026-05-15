// ─── Update Status ────────────────────────────────────────────────────────────

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

// ─── Data Shapes ─────────────────────────────────────────────────────────────

export interface UpdateVersionInfo {
  version: string;
  releaseDate: string;
  releaseName?: string;
  releaseNotes?: string;
}

export interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdaterState {
  status: UpdateStatus;
  currentVersion: string;
  info?: UpdateVersionInfo;
  progress?: UpdateProgress;
  error?: string;
}

// ─── IPC Channel Constants ────────────────────────────────────────────────────
// Single source of truth imported by main process, preload, and renderer types.
// Renderer receives only the string values through window.launcher typings.

export const IPC_UPDATER = {
  CHECK:         'updater:check',
  DOWNLOAD:      'updater:download',
  INSTALL:       'updater:install',
  GET_STATE:     'updater:get-state',
  STATE_CHANGED: 'updater:state-changed',
} as const;
