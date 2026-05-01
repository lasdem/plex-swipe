import { useState, useEffect, useMemo } from 'react'
import { Settings as SettingsIcon, ChevronLeft } from 'lucide-react'
import SettingsModal from './components/SettingsModal'
import LibrarySelector from './components/LibrarySelector'
import CardStack from './components/CardStack'
import { PlexService, type PlexLibrary, type PlexMediaItem } from './services/plexApi'

interface PlexConfig {
  serverUrl: string;
  token: string;
}

function App() {
  const [config, setConfig] = useState<PlexConfig | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [libraries, setLibraries] = useState<PlexLibrary[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<PlexLibrary | null>(null);
  const [items, setItems] = useState<PlexMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plexService = useMemo(() => {
    if (config) {
      return new PlexService(config.serverUrl, config.token);
    }
    return null;
  }, [config]);

  useEffect(() => {
    const savedUrl = localStorage.getItem('plex_server_url');
    const savedToken = localStorage.getItem('plex_token');
    if (savedUrl && savedToken) {
      setConfig({ serverUrl: savedUrl, token: savedToken });
    } else {
      setIsSettingsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (plexService && !selectedLibrary) {
      fetchLibraries();
    }
  }, [plexService, selectedLibrary]);

  const fetchLibraries = async () => {
    if (!plexService) return;
    setIsLoading(true);
    setError(null);
    try {
      const libs = await plexService.getLibraries();
      setLibraries(libs);
    } catch (err) {
      setError('Failed to fetch libraries. Check your settings and server status.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLibrary = async (library: PlexLibrary) => {
    setSelectedLibrary(library);
    if (!plexService) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const mediaItems = await plexService.getLibraryItems(library.key);
      
      // Filter based on local swipes
      const swipedData = JSON.parse(localStorage.getItem('plex_swipes') || '{}');
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      const filteredItems = mediaItems.filter(item => {
        const swipe = swipedData[item.ratingKey];
        if (!swipe) return true;
        if (swipe.action === 'favorite' || swipe.action === 'delete') return false;
        if (swipe.action === 'keep_temp') {
          return (now - swipe.timestamp) > thirtyDaysMs;
        }
        return true;
      });

      // Shuffle items for a more "Tinder" feel
      const shuffled = [...filteredItems].sort(() => Math.random() - 0.5);
      setItems(shuffled);
    } catch (err) {
      setError('Failed to fetch library items.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (item: PlexMediaItem, direction: string) => {
    if (!plexService) return;

    let action = '';
    try {
      if (direction === 'up') {
        action = 'favorite';
        await plexService.addTag(item.ratingKey, 'label', 'favorite');
      } else if (direction === 'left') {
        action = 'delete';
        await plexService.addTag(item.ratingKey, 'label', 'leaving_soon');
      } else if (direction === 'right') {
        action = 'keep_temp';
        await plexService.addTag(item.ratingKey, 'label', 'keep_temp');
      }

      if (action) {
        const swipedData = JSON.parse(localStorage.getItem('plex_swipes') || '{}');
        swipedData[item.ratingKey] = { action, timestamp: Date.now() };
        localStorage.setItem('plex_swipes', JSON.stringify(swipedData));
      }
    } catch (err) {
      console.error(`Failed to apply ${action} to ${item.title}:`, err);
    }
  };

  const handleSaveSettings = (url: string, token: string) => {
    localStorage.setItem('plex_server_url', url);
    localStorage.setItem('plex_token', token);
    setConfig({ serverUrl: url, token: token });
    setIsSettingsOpen(false);
    setSelectedLibrary(null);
    setItems([]);
  };

  const handleClearData = async () => {
    if (!plexService) return;
    
    setIsLoading(true);
    const swipedData = JSON.parse(localStorage.getItem('plex_swipes') || '{}');
    const ratingKeys = Object.keys(swipedData);

    try {
      for (const ratingKey of ratingKeys) {
        const swipe = swipedData[ratingKey];
        if (swipe.action === 'favorite') {
          await plexService.removeTag(ratingKey, 'label', 'favorite');
        } else if (swipe.action === 'delete') {
          await plexService.removeTag(ratingKey, 'label', 'leaving_soon');
        } else if (swipe.action === 'keep_temp') {
          await plexService.removeTag(ratingKey, 'label', 'keep_temp');
        }
      }
      localStorage.removeItem('plex_swipes');
      setItems([]);
      setSelectedLibrary(null);
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to clear data:', err);
      setError('Some items could not be reset on the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSelection = () => {
    setSelectedLibrary(null);
    setItems([]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center">
      <header className="w-full max-w-4xl p-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          {selectedLibrary && (
            <button 
              onClick={resetSelection}
              className="p-2 -ml-2 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-xl font-bold text-orange-500">PlexSwipe</h1>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
        >
          <SettingsIcon className="w-6 h-6" />
        </button>
      </header>

      <main className="w-full flex-grow flex flex-col items-center justify-center overflow-hidden">
        {error && (
          <div className="max-w-md w-full px-4">
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-center">
              {error}
            </div>
          </div>
        )}

        {!config ? (
          <div className="text-center">
            <p className="text-zinc-400 mb-4">Please configure your Plex settings to get started.</p>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-orange-600/20"
            >
              Open Settings
            </button>
          </div>
        ) : !selectedLibrary ? (
          <div className="w-full max-w-md px-4">
            <LibrarySelector 
              libraries={libraries} 
              onSelect={handleSelectLibrary} 
              isLoading={isLoading} 
            />
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-400">Loading {selectedLibrary.title}...</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {plexService && <CardStack items={items} plexService={plexService} onAction={handleAction} />}
          </div>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsModal 
          onSave={handleSaveSettings} 
          onClearData={handleClearData}
          onClose={() => setIsSettingsOpen(false)}
          initialUrl={config?.serverUrl || ''}
          initialToken={config?.token || ''}
        />
      )}
    </div>
  )
}

export default App
