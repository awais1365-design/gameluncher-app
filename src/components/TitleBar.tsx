import { useLauncher } from '../store/LauncherContext';

export default function TitleBar() {
  const { downloads } = useLauncher();
  const activeCount = Object.values(downloads).filter((d) => d.status === 'downloading' || d.status === 'installing').length;

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <div className="titlebar-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="titlebar-title">GameLauncher</span>
        </div>
        {activeCount > 0 && (
          <span className="titlebar-badge">{activeCount} downloading</span>
        )}
      </div>
      <div className="titlebar-controls">
        <button className="wc-btn wc-minimize" onClick={() => window.launcher.minimize()} title="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>
        </button>
        <button className="wc-btn wc-maximize" onClick={() => window.launcher.maximize()} title="Maximize">
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
        </button>
        <button className="wc-btn wc-close" onClick={() => window.launcher.close()} title="Close">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
