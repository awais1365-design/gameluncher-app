import { useState, useEffect } from 'react';
import { useLauncher } from '../store/LauncherContext';

export default function SettingsView() {
  const { settings, updateSettings } = useLauncher();
  const [installDir, setInstallDir] = useState(settings.installDir);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInstallDir(settings.installDir);
  }, [settings.installDir]);

  async function handleBrowse() {
    const dir = await window.launcher.browseInstallDir();
    if (dir) setInstallDir(dir);
  }

  async function handleSave() {
    await updateSettings({ installDir });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Settings</h1>
      </div>

      <div className="settings-body">
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
                <button className="btn btn--ghost btn--sm" onClick={handleBrowse}>
                  Browse…
                </button>
              </div>
            </div>
          </div>
        </section>

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
