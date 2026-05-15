import { useState } from 'react';
import { useUpdater } from '../hooks/useUpdater';

function fmtBytes(n: number): string {
  if (n < 1024)        return `${n} B`;
  if (n < 1_048_576)   return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1_048_576).toFixed(1)} MB`;
}

function fmtSpeed(bps: number): string {
  if (bps < 1024)      return `${bps} B/s`;
  if (bps < 1_048_576) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${(bps / 1_048_576).toFixed(1)} MB/s`;
}

/**
 * Steam-like bottom status bar for LAUNCHER self-updates.
 * Rendered at the bottom of App — sits below the app-body flex row.
 * Invisible (zero height) while status is idle or not-available.
 */
export default function UpdateNotification() {
  const { state, checkForUpdates, downloadUpdate, install } = useUpdater();

  // "Later" dismisses the available prompt for this session only
  const [dismissed, setDismissed] = useState(false);

  const isVisible =
    state.status !== 'idle' &&
    state.status !== 'not-available' &&
    !(state.status === 'available' && dismissed);

  if (!isVisible) return null;

  return (
    <div
      className={`update-bar update-bar--${state.status}`}
      role="status"
      aria-live="polite"
    >
      {/* ── Checking ─────────────────────────────────────── */}
      {state.status === 'checking' && (
        <>
          <span className="update-bar__spinner" />
          <span className="update-bar__text">Checking for launcher update…</span>
        </>
      )}

      {/* ── Update available ─────────────────────────────── */}
      {state.status === 'available' && (
        <>
          <svg className="update-bar__icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="update-bar__text">
            GameLauncher <strong>v{state.info?.version}</strong> is available
          </span>
          <div className="update-bar__actions">
            <button className="update-bar__btn update-bar__btn--primary" onClick={downloadUpdate}>
              Download Update
            </button>
            <button className="update-bar__btn update-bar__btn--ghost" onClick={() => setDismissed(true)}>
              Later
            </button>
          </div>
        </>
      )}

      {/* ── Downloading ──────────────────────────────────── */}
      {state.status === 'downloading' && (
        <>
          <span className="update-bar__spinner" />
          <div className="update-bar__progress-wrap">
            <div className="update-bar__progress-track">
              <div
                className="update-bar__progress-fill"
                style={{ width: `${state.progress?.percent ?? 0}%` }}
              />
            </div>
          </div>
          <span className="update-bar__text">
            Updating launcher&nbsp;·&nbsp;{Math.round(state.progress?.percent ?? 0)}%
            {state.progress && (
              <>&nbsp;·&nbsp;{fmtBytes(state.progress.transferred)} / {fmtBytes(state.progress.total)}&nbsp;·&nbsp;{fmtSpeed(state.progress.bytesPerSecond)}</>
            )}
          </span>
        </>
      )}

      {/* ── Ready to install ─────────────────────────────── */}
      {state.status === 'downloaded' && (
        <>
          <svg className="update-bar__icon update-bar__icon--success" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="update-bar__text">
            v{state.info?.version} downloaded — restart to apply
          </span>
          <div className="update-bar__actions">
            <button className="update-bar__btn update-bar__btn--primary" onClick={install}>
              Restart &amp; Install
            </button>
          </div>
        </>
      )}

      {/* ── Error ────────────────────────────────────────── */}
      {state.status === 'error' && (
        <>
          <svg className="update-bar__icon update-bar__icon--error" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="update-bar__text update-bar__text--error">
            Update failed: {state.error}
          </span>
          <div className="update-bar__actions">
            <button className="update-bar__btn update-bar__btn--ghost" onClick={checkForUpdates}>
              Retry
            </button>
          </div>
        </>
      )}
    </div>
  );
}
