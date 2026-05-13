import { useState } from 'react';
import { useLauncher } from '../store/LauncherContext';
import GameCard from './GameCard';

export default function LibraryView() {
  const { games, installed, downloads, installGame, launchGame, uninstallGame, setView } = useLauncher();
  const [search, setSearch] = useState('');

  const installedGames = games.filter((g) => installed[g._id]);
  const filtered = installedGames.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (installedGames.length === 0) {
    return (
      <div className="view-container">
        <div className="view-header">
          <h1 className="view-title">Library</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 10h16M4 14h10" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              <rect x="14" y="12" width="6" height="7" rx="1" stroke="var(--text-muted)" strokeWidth="1.5"/>
            </svg>
          </div>
          <h2 className="empty-title">Your library is empty</h2>
          <p className="empty-sub">Head to the Store to find and install games.</p>
          <button className="btn btn--primary" onClick={() => setView('store')}>
            Browse Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Library</h1>
        <div className="view-header-right">
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="search-icon">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search library…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="view-count">{filtered.length} game{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state empty-state--sm">
          <p className="empty-sub">No games match "{search}"</p>
        </div>
      ) : (
        <div className="game-grid">
          {filtered.map((game) => (
            <GameCard
              key={game._id}
              game={game}
              installed={installed[game._id]}
              download={downloads[game._id]}
              onInstall={() => installGame(game)}
              onLaunch={() => launchGame(game._id)}
              onUninstall={() => uninstallGame(game._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
