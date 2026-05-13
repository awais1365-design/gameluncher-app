import { useState } from 'react';
import { useLauncher } from '../store/LauncherContext';
import GameCard from './GameCard';

type Filter = 'all' | 'installed' | 'available';

export default function StoreView() {
  const { games, installed, downloads, installGame, launchGame, uninstallGame, gamesLoading, gamesError, refreshGames } = useLauncher();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = games.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const isInstalled = !!installed[g._id];
    if (filter === 'installed' && !isInstalled) return false;
    if (filter === 'available' && isInstalled) return false;
    return matchSearch;
  });

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Store</h1>
        <div className="view-header-right">
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="search-icon">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search games…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn--ghost btn--sm" onClick={refreshGames} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="filter-bar">
        {(['all', 'available', 'installed'] as Filter[]).map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'available' ? 'Not Installed' : 'Installed'}
          </button>
        ))}
        <span className="view-count" style={{ marginLeft: 'auto' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {gamesLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading games…</p>
        </div>
      ) : gamesError ? (
        <div className="error-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--danger)" strokeWidth="1.5"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="error-msg">{gamesError}</p>
          <button className="btn btn--primary btn--sm" onClick={refreshGames}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state empty-state--sm">
          <p className="empty-sub">
            {games.length === 0 ? 'No games have been added yet.' : `No results for "${search}"`}
          </p>
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
