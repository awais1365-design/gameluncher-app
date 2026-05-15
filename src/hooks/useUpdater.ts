import { useEffect, useState, useCallback } from 'react';
import type { UpdaterState } from '../types/index';

const INITIAL_STATE: UpdaterState = {
  status: 'idle',
  currentVersion: '',
};

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>(INITIAL_STATE);

  useEffect(() => {
    // Hydrate with current state from the main process
    window.launcher.updater.getState().then(setState).catch(() => {});

    // Subscribe to real-time pushes from UpdaterService
    const unsubscribe = window.launcher.updater.onStateChanged(setState);
    return unsubscribe;
  }, []);

  const checkForUpdates = useCallback(() => {
    window.launcher.updater.checkForUpdates().catch(() => {});
  }, []);

  const downloadUpdate = useCallback(() => {
    window.launcher.updater.downloadUpdate().catch(() => {});
  }, []);

  const install = useCallback(() => {
    window.launcher.updater.install().catch(() => {});
  }, []);

  return { state, checkForUpdates, downloadUpdate, install };
}
