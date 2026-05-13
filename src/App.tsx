import { LauncherProvider, useLauncher } from './store/LauncherContext';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import LibraryView from './components/LibraryView';
import StoreView from './components/StoreView';
import DownloadsView from './components/DownloadsView';
import SettingsView from './components/SettingsView';

function AppContent() {
  const { view } = useLauncher();

  return (
    <div className="app">
      <TitleBar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          {view === 'library'   && <LibraryView />}
          {view === 'store'     && <StoreView />}
          {view === 'downloads' && <DownloadsView />}
          {view === 'settings'  && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LauncherProvider>
      <AppContent />
    </LauncherProvider>
  );
}
