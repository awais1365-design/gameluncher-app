import { useLauncher } from '../store/LauncherContext';
import { formatBytes } from '../utils/format';

const STATUS_LABEL: Record<string, string> = {
  downloading: 'Downloading',
  installing: 'Installing',
  done: 'Complete',
  error: 'Failed',
};

export default function DownloadsView() {
  const { downloads, clearDownload, setView, launchGame } = useLauncher();
  const entries = Object.values(downloads);

  if (entries.length === 0) {
    return (
      <div className="view-container">
        <div className="view-header">
          <h1 className="view-title">Downloads</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v13M7 11l5 5 5-5" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 21h14" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="empty-title">No downloads</h2>
          <p className="empty-sub">Active and completed downloads will appear here.</p>
          <button className="btn btn--primary" onClick={() => setView('store')}>Browse Store</button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Downloads</h1>
        <div className="view-header-right">
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => entries.filter((d) => d.status === 'done' || d.status === 'error').forEach((d) => clearDownload(d.gameId))}
          >
            Clear completed
          </button>
        </div>
      </div>

      <div className="downloads-list">
        {entries.map((dl) => (
          <div key={dl.gameId} className={`dl-row dl-row--${dl.status}`}>
            <div className="dl-info">
              <span className="dl-name">{dl.gameName}</span>
              <span className="dl-version">v{dl.version}</span>
            </div>

            <div className="dl-progress-area">
              {(dl.status === 'downloading' || dl.status === 'installing') && (
                <>
                  <div className="progress-bar progress-bar--wide">
                    <div
                      className={`progress-fill ${dl.status === 'installing' ? 'progress-fill--pulse' : ''}`}
                      style={{ width: dl.status === 'installing' ? '100%' : `${dl.percent}%` }}
                    />
                  </div>
                  <div className="dl-stats">
                    <span>{STATUS_LABEL[dl.status]}{dl.status === 'downloading' ? `… ${dl.percent}%` : '…'}</span>
                    {dl.status === 'downloading' && dl.total > 0 && (
                      <span>{formatBytes(dl.received)} / {formatBytes(dl.total)}</span>
                    )}
                  </div>
                </>
              )}

              {dl.status === 'done' && (
                <div className="dl-done">
                  <span className="dl-status dl-status--done">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Installed
                  </span>
                  <button className="btn btn--play btn--sm" onClick={() => launchGame(dl.gameId)}>
                    ▶ Play
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => clearDownload(dl.gameId)}>
                    Dismiss
                  </button>
                </div>
              )}

              {dl.status === 'error' && (
                <div className="dl-done">
                  <span className="dl-status dl-status--error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Failed
                  </span>
                  <span className="dl-error-msg">{dl.error}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => clearDownload(dl.gameId)}>
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
