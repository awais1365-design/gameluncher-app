import React from 'react';
import { useLauncher } from '../store/LauncherContext';
import type { View } from '../types';

const NAV: { id: View; label: string; icon: React.ReactElement }[] = [
  {
    id: 'library',
    label: 'Library',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h16M4 10h16M4 14h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <rect x="14" y="12" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    id: 'store',
    label: 'Store',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'downloads',
    label: 'Downloads',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { view, setView, downloads, installed } = useLauncher();
  const activeDownloads = Object.values(downloads).filter(
    (d) => d.status === 'downloading' || d.status === 'installing'
  ).length;
  const installedCount = Object.keys(installed).length;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${view === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {item.id === 'library' && installedCount > 0 && (
              <span className="sidebar-count">{installedCount}</span>
            )}
            {item.id === 'downloads' && activeDownloads > 0 && (
              <span className="sidebar-count sidebar-count--active">{activeDownloads}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-status-dot" />
        <span>Online</span>
      </div>
    </aside>
  );
}
