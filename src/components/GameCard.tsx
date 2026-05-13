import type { Game, InstalledGame, DownloadState } from '../types';
import { formatBytes } from '../utils/format';

const GRADIENTS = [
  ['#0f2027', '#203a43', '#2c5364'],
  ['#1a1a2e', '#16213e', '#0f3460'],
  ['#2d1b69', '#11998e', '#38ef7d'],
  ['#360033', '#0b8793', '#360033'],
  ['#134e5e', '#71b280', '#134e5e'],
  ['#1c1c1c', '#434343', '#1c1c1c'],
  ['#141e30', '#243b55', '#141e30'],
  ['#1e3c72', '#2a5298', '#1e3c72'],
];

function coverGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = GRADIENTS[Math.abs(hash) % GRADIENTS.length];
  return `linear-gradient(135deg, ${colors.join(', ')})`;
}

type Props = {
  game: Game;
  installed?: InstalledGame;
  download?: DownloadState;
  onInstall: () => void;
  onLaunch: () => void;
  onUninstall: () => void;
};

export default function GameCard({ game, installed, download, onInstall, onLaunch, onUninstall }: Props) {
  const latestVersion = game.versions?.[0];
  const isInstalled = !!installed;
  const isDownloading = download?.status === 'downloading';
  const isInstalling = download?.status === 'installing';
  const isBusy = isDownloading || isInstalling;
  const hasUpdate = isInstalled && latestVersion && installed.version !== latestVersion.version;

  return (
    <div className={`game-card ${isBusy ? 'game-card--busy' : ''}`}>
      <div className="game-cover" style={{ background: coverGradient(game.name) }}>
        <span className="game-cover-letter">{game.name[0].toUpperCase()}</span>
        {isInstalled && !hasUpdate && (
          <span className="game-badge game-badge--installed">Installed</span>
        )}
        {hasUpdate && (
          <span className="game-badge game-badge--update">Update</span>
        )}
      </div>

      <div className="game-info">
        <h3 className="game-name" title={game.name}>{game.name}</h3>
        <div className="game-meta">
          {latestVersion ? (
            <span className="game-version">v{latestVersion.version}</span>
          ) : (
            <span className="game-version game-version--none">No release</span>
          )}
          {latestVersion?.size && (
            <span className="game-size">{formatBytes(latestVersion.size)}</span>
          )}
        </div>

        {isBusy ? (
          <div className="game-progress">
            <div className="progress-bar">
              <div
                className="progress-fill progress-fill--animated"
                style={{ width: isInstalling ? '100%' : `${download.percent}%` }}
              />
            </div>
            <span className="progress-label">
              {isInstalling ? 'Installing…' : `${download.percent}%`}
            </span>
          </div>
        ) : (
          <div className="game-actions">
            {!isInstalled && !latestVersion ? null : !isInstalled ? (
              <button className="btn btn--primary btn--sm" onClick={onInstall}>
                Install
              </button>
            ) : (
              <>
                <button className="btn btn--play btn--sm" onClick={onLaunch}>
                  ▶ Play
                </button>
                {hasUpdate && (
                  <button className="btn btn--update btn--sm" onClick={onInstall}>
                    Update
                  </button>
                )}
                <button className="btn btn--ghost btn--sm" onClick={onUninstall} title="Uninstall">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
