import { useState, useEffect } from 'react';
import { useLauncher } from '../store/LauncherContext';
import { useUpdater } from '../hooks/useUpdater';
import { formatBytes } from '../utils/format';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

const LAUNCHER_STATUS_LABEL: Record<string, { text: string; className: string }> = {
  idle:          { text: 'Up to date',       className: 'update-status--ok'       },
  checking:      { text: 'Checking…',        className: 'update-status--checking' },
  'not-available': { text: 'Up to date',     className: 'update-status--ok'       },
  available:     { text: 'Update available', className: 'update-status--warning'  },
  downloading:   { text: 'Downloading…',     className: 'update-status--checking' },
  downloaded:    { text: 'Ready to install', className: 'update-status--ready'    },
  error:         { text: 'Check failed',     className: 'update-status--error'    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsView() {
  const { settings, updateSettings, games, installed, installGame, gameUpdates, checkGameUpdates } = useLauncher();
  const { state: launcher, checkForUpdates, downloadUpdate, install } = useUpdater();

  const [installDir, setInstallDir]   = useState(settings.installDir);
  const [saved, setSaved]             = useState(false);
  const [lastCheckedDisplay, setLastCheckedDisplay] = useState('Never');

  useEffect(() => { setInstallDir(settings.installDir); }, [settings.installDir]);

  // Refresh "X min ago" label every 30 s
  useEffect(() => {
    function tick() {
      setLastCheckedDisplay(relativeTime(gameUpdates.lastChecked));
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [gameUpdates.lastChecked]);

  async function handleBrowse() {
    const dir = await window.launcher.browseInstallDir();
    if (dir) setInstallDir(dir);
  }

  async function handleSave() {
    await updateSettings({ installDir });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Games that have an available update — cross-referenced with installed map
  const updatableGames = Object.values(gameUpdates.games)
    .filter((g) => g.status === 'available' && g.info)
    .map((g) => {
      const gameDoc = games.find((x) => x._id === g.gameId);
      return { gameState: g, gameDoc };
    });

  const launcherStatusInfo = LAUNCHER_STATUS_LABEL[launcher.status] ??
    { text: launcher.status, className: '' };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Settings</h1>
      </div>

      <div className="settings-body">

        {/* ── Installation ──────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">Installation</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <label className="settings-label">Install Directory</label>
              <p className="settings-desc">Where games and apps are downloaded and extracted.</p>
            </div>
            <div className="settings-row-control">
              <div className="dir-input-group">
                <input
                  className="dir-input"
                  type="text"
                  value={installDir}
                  onChange={(e) => setInstallDir(e.target.value)}
                  readOnly
                />
                <button className="btn btn--ghost btn--sm" onClick={handleBrowse}>Browse…</button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Launcher Updates ──────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">Launcher Updates</h2>

          <div className="settings-row settings-row--update">
            <div className="settings-row-info">
              <label className="settings-label">Version</label>
              <p className="settings-desc">
                Current: <strong className="version-tag">v{launcher.currentVersion || '—'}</strong>
                {launcher.info?.version && launcher.status === 'available' && (
                  <> &nbsp;→&nbsp; <strong className="version-tag version-tag--new">v{launcher.info.version}</strong></>
                )}
              </p>
            </div>
            <div className="settings-row-control settings-row-control--update">
              <span className={`update-status ${launcherStatusInfo.className}`}>
                {launcher.status === 'checking' && <span className="update-spinner" />}
                {launcherStatusInfo.text}
              </span>

              {/* Action button depends on current state */}
              {(launcher.status === 'idle' || launcher.status === 'not-available' || launcher.status === 'error') && (
                <button className="btn btn--ghost btn--sm" onClick={checkForUpdates}>
                  Check for Updates
                </button>
              )}
              {launcher.status === 'available' && (
                <button className="btn btn--update btn--sm" onClick={downloadUpdate}>
                  Download
                </button>
              )}
              {launcher.status === 'downloading' && (
                <div className="inline-progress">
                  <div className="inline-progress__track">
                    <div
                      className="inline-progress__fill"
                      style={{ width: `${launcher.progress?.percent ?? 0}%` }}
                    />
                  </div>
                  <span>{Math.round(launcher.progress?.percent ?? 0)}%</span>
                </div>
              )}
              {launcher.status === 'downloaded' && (
                <button className="btn btn--primary btn--sm" onClick={install}>
                  Restart &amp; Install
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Game Updates ──────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">Game Updates</h2>

          <div className="settings-row settings-row--update">
            <div className="settings-row-info">
              <label className="settings-label">
                {Object.keys(installed).length} game{Object.keys(installed).length !== 1 ? 's' : ''} installed
              </label>
              <p className="settings-desc">
                Last checked: <span className="last-checked">{lastCheckedDisplay}</span>
                {gameUpdates.isChecking && <>&nbsp;·&nbsp;<span className="update-spinner update-spinner--sm" /></>}
                {!gameUpdates.isOnline && <>&nbsp;·&nbsp;<span className="offline-badge">Offline</span></>}
              </p>
            </div>
            <div className="settings-row-control settings-row-control--update">
              {updatableGames.length > 0 && (
                <span className="update-status update-status--warning">
                  {updatableGames.length} update{updatableGames.length !== 1 ? 's' : ''} available
                </span>
              )}
              {updatableGames.length === 0 && !gameUpdates.isChecking && (
                <span className="update-status update-status--ok">All games up to date</span>
              )}
              <button
                className="btn btn--ghost btn--sm"
                onClick={checkGameUpdates}
                disabled={gameUpdates.isChecking}
              >
                {gameUpdates.isChecking ? 'Checking…' : 'Check Now'}
              </button>
            </div>
          </div>

          {/* Per-game update rows */}
          {updatableGames.length > 0 && (
            <div className="game-update-list">
              {updatableGames.map(({ gameState, gameDoc }) => {
                if (!gameState.info) return null;
                const { info } = gameState;
                return (
                  <div key={info.gameId} className="game-update-row">
                    <div className="game-update-row__cover">
                      <span>{info.gameName[0].toUpperCase()}</span>
                    </div>
                    <div className="game-update-row__info">
                      <span className="game-update-row__name">{info.gameName}</span>
                      <span className="game-update-row__versions">
                        v{info.installedVersion} → v{info.latestVersion}
                        {info.downloadSize > 0 && (
                          <>&nbsp;·&nbsp;{formatBytes(info.downloadSize)}</>
                        )}
                      </span>
                    </div>
                    <div className="game-update-row__action">
                      {gameDoc && (
                        <button
                          className="btn btn--update btn--sm"
                          onClick={() => installGame(gameDoc)}
                          title={`Update to v${info.latestVersion}`}
                        >
                          Update
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Backend ───────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title">Backend</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <label className="settings-label">API Endpoint</label>
              <p className="settings-desc">NestJS backend for game catalog and version management.</p>
            </div>
            <div className="settings-row-control">
              <input className="dir-input" type="text" value="http://localhost:3000" readOnly />
            </div>
          </div>
        </section>

        <div className="settings-actions">
          <button className="btn btn--primary" onClick={handleSave}>
            {saved ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved
              </>
            ) : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
