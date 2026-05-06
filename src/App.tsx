import { useState, useEffect, useMemo } from 'react'
import {
  Settings as SettingsIcon, ChevronLeft, Filter,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Heart, Star, Trash2, Ban, EyeOff, Check, Bookmark,
  ThumbsUp, ThumbsDown, Archive, Flag
} from 'lucide-react'
import SettingsView from './components/SettingsView'
import LibrarySelector from './components/LibrarySelector'
import CardStack from './components/CardStack'
import { PlexService, type PlexLibrary, type PlexMediaItem } from './services/plexApi'

export type SwipeActionType = 'add_label' | 'remove_label' | 'add_collection' | 'remove_collection' | 'ignore';

export interface SwipeAction {
  type: SwipeActionType;
  value: string;
  days?: number;
}

export const AVAILABLE_ICONS = {
  ArrowUp: { component: ArrowUp, label: 'Arrow Up' },
  ArrowDown: { component: ArrowDown, label: 'Arrow Down' },
  ArrowLeft: { component: ArrowLeft, label: 'Arrow Left' },
  ArrowRight: { component: ArrowRight, label: 'Arrow Right' },
  Heart: { component: Heart, label: 'Heart' },
  Star: { component: Star, label: 'Star' },
  Trash2: { component: Trash2, label: 'Delete' },
  Ban: { component: Ban, label: 'Ban' },
  EyeOff: { component: EyeOff, label: 'Hide' },
  Check: { component: Check, label: 'Check' },
  Bookmark: { component: Bookmark, label: 'Bookmark' },
  ThumbsUp: { component: ThumbsUp, label: 'Thumbs Up' },
  ThumbsDown: { component: ThumbsDown, label: 'Thumbs Down' },
  Archive: { component: Archive, label: 'Archive' },
  Flag: { component: Flag, label: 'Flag' },
};

export interface SwipeDirectionConfig {
  actions: SwipeAction[];
  icon: string;
  color: string;
}

export interface SwipeConfig {
  up: SwipeDirectionConfig;
  down: SwipeDirectionConfig;
  left: SwipeDirectionConfig;
  right: SwipeDirectionConfig;
}

interface PlexConfig {
  serverUrl: string;
  token: string;
}

const DEFAULT_SWIPE_CONFIG: SwipeConfig = {
  up: { actions: [{ type: 'add_collection', value: 'favorite' }], icon: 'ArrowUp', color: '#60a5fa' },
  left: { actions: [{ type: 'add_label', value: 'delete' }], icon: 'ArrowLeft', color: '#ef4444' },
  right: { actions: [{ type: 'ignore', value: 'keep_temp', days: 30 }], icon: 'ArrowRight', color: '#22c55e' },
  down: { actions: [{ type: 'remove_collection', value: 'favorite' }, { type: 'remove_label', value: 'delete' }], icon: 'ArrowDown', color: '#fb923c' }
};

interface HistoryEntry {
  item: PlexMediaItem;
  direction: string;
}

const CardSkeleton = () => (
  <div className="w-[85vw] max-w-[340px] aspect-[2/3] bg-zinc-900 rounded-3xl border border-zinc-800 flex flex-col items-center justify-center space-y-4 animate-pulse">
    <div className="w-16 h-16 bg-zinc-800 rounded-full" />
    <div className="w-32 h-4 bg-zinc-800 rounded" />
    <div className="w-24 h-3 bg-zinc-800 rounded" />
  </div>
);

function App() {
  const [config, setConfig] = useState<PlexConfig | null>(null);
  const [swipeConfig, setSwipeConfig] = useState<SwipeConfig>(DEFAULT_SWIPE_CONFIG);
  const [ignoreList, setIgnoreList] = useState<Record<string, number>>({});
  const [actionHistory, setActionHistory] = useState<HistoryEntry[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [libraries, setLibraries] = useState<PlexLibrary[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<PlexLibrary | null>(null);
  const [allItems, setAllItems] = useState<PlexMediaItem[]>([]);
  const [items, setItems] = useState<PlexMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<string>('unlabeled');
  const [filterCollection, setFilterCollection] = useState<string>('none');
  const [swipedKeys, setSwipedKeys] = useState<Set<string>>(new Set());

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

    // Load and Migrate Swipe Config
    const savedSwipeConfig = localStorage.getItem('swipe_config');
    if (savedSwipeConfig) {
      try {
        const parsed = JSON.parse(savedSwipeConfig);
        // Migration: If the old format (array of actions) is found, convert to new format
        if (Array.isArray(parsed.up)) {
          const migrated: SwipeConfig = {
            up: { actions: parsed.up, icon: 'ArrowUp', color: DEFAULT_SWIPE_CONFIG.up.color },
            down: { actions: parsed.down, icon: 'ArrowDown', color: DEFAULT_SWIPE_CONFIG.down.color },
            left: { actions: parsed.left, icon: 'ArrowLeft', color: DEFAULT_SWIPE_CONFIG.left.color },
            right: { actions: parsed.right, icon: 'ArrowRight', color: DEFAULT_SWIPE_CONFIG.right.color }
          };
          setSwipeConfig(migrated);
          localStorage.setItem('swipe_config', JSON.stringify(migrated));
        } else {
          // Migration: Ensure color exists
          let needsUpdate = false;
          ['up', 'down', 'left', 'right'].forEach(dir => {
            const d = dir as keyof SwipeConfig;
            if (!parsed[d].color) {
              parsed[d].color = DEFAULT_SWIPE_CONFIG[d].color;
              needsUpdate = true;
            }
          });
          setSwipeConfig(parsed);
          if (needsUpdate) {
            localStorage.setItem('swipe_config', JSON.stringify(parsed));
          }
        }
      } catch (e) {
        console.error('Failed to parse swipe config:', e);
        setSwipeConfig(DEFAULT_SWIPE_CONFIG);
      }
    }

    // Load and Migrate Ignore List
    const savedIgnoreList = localStorage.getItem('ignore_list');
    const legacySwipes = localStorage.getItem('plex_swipes');
    const now = Date.now();

    let currentIgnoreList: Record<string, number> = {};
    if (savedIgnoreList) {
      const parsed = JSON.parse(savedIgnoreList);
      Object.entries(parsed).forEach(([key, expiry]) => {
        if ((expiry as number) > now) {
          currentIgnoreList[key] = expiry as number;
        }
      });
    }

    if (legacySwipes) {
      const legacyData: Record<string, { action: string; timestamp: number }> = JSON.parse(legacySwipes);
      Object.entries(legacyData).forEach(([ratingKey, data]) => {
        if (data.action === 'keep_temp') {
          const expiry = data.timestamp + (30 * 24 * 60 * 60 * 1000);
          if (expiry > now) {
            currentIgnoreList[ratingKey] = expiry;
          }
        }
      });
      localStorage.removeItem('plex_swipes');
    }

    localStorage.setItem('ignore_list', JSON.stringify(currentIgnoreList));
    setIgnoreList(currentIgnoreList);
  }, []);

  useEffect(() => {
    if (plexService && !selectedLibrary) {
      fetchLibraries();
    }
  }, [plexService, selectedLibrary]);

  useEffect(() => {
    applyFilters();
  }, [allItems, filterLabel, filterCollection, ignoreList, swipedKeys]);

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
    setSwipedKeys(new Set()); // Reset swiped keys
    if (!plexService) return;

    setIsLoading(true);
    setError(null);
    try {
      let mediaItems = await plexService.getLibraryItems(library.key);
      // Initial shuffle for Tinder feel
      mediaItems = [...mediaItems].sort(() => Math.random() - 0.5);
      setAllItems(mediaItems);

      // Deep Fetch: If the library is small, fetch full metadata for all items 
      // because some library types (Other Videos) hide Labels in the bulk list.
      if (mediaItems.length > 0 && mediaItems.length < 100) {
        console.log(`Performing Deep Fetch for ${mediaItems.length} items...`);
        let enrichedItems = await Promise.all(
          mediaItems.map(item => plexService.getMetadata(item.ratingKey))
        );
        // Maintain the shuffled order
        enrichedItems = mediaItems.map(m => enrichedItems.find(e => e.ratingKey === m.ratingKey) || m);
        console.log('Deep Fetch complete. Sample enriched item:', enrichedItems[0]);
        setAllItems(enrichedItems);
      } else if (mediaItems.length > 0) {
        console.log('Sample item metadata (Standard Fetch):', mediaItems[0]);
      }
    } catch (err) {
      setError('Failed to fetch library items.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    const now = Date.now();
    console.log('Applying filters to', allItems.length, 'items');
    let filtered = allItems.filter(item => {
      // 0. Session Swiped Filter
      if (swipedKeys.has(item.ratingKey)) return false;

      // 1. Local Ignore Filter
      const expiry = ignoreList[item.ratingKey];
      if (expiry && expiry > now) {
        console.log('Filtered out by ignore list:', item.title);
        return false;
      }

      // 2. Label Filter
      const itemLabels = item.Label || item.Labels || [];
      if (filterLabel === 'unlabeled') {
        if (itemLabels.length > 0) {
          console.log('Filtering out because it has labels:', item.title, itemLabels);
          return false;
        }
      } else if (filterLabel !== 'all') {
        if (!itemLabels.some((l) => l.tag === filterLabel)) return false;
      }

      // 3. Collection Filter
      if (filterCollection === 'none') {
        if ((item.Collection || []).length > 0) return false;
      } else if (filterCollection !== 'all') {
        if (!item.Collection?.some(c => c.tag === filterCollection)) return false;
      }

      return true;
    });

    console.log('Filtered items count:', filtered.length);
    // Don't re-shuffle here to maintain stability when an item is swiped
    setItems(filtered);
  };

  const availableLabels = useMemo(() => {
    const labels = new Set<string>();
    allItems.forEach(item => {
      const itemLabels = item.Label || item.Labels || [];
      itemLabels.forEach((l) => labels.add(l.tag));
    });
    return Array.from(labels).sort();
  }, [allItems]);

  const availableCollections = useMemo(() => {
    const collections = new Set<string>();
    allItems.forEach(item => item.Collection?.forEach(c => collections.add(c.tag)));
    return Array.from(collections).sort();
  }, [allItems]);

  const handleAction = async (item: PlexMediaItem, direction: string) => {
    if (!plexService) return;

    const config = swipeConfig[direction as keyof SwipeConfig];
    if (!config || !config.actions) return;

    // Save to history before executing
    setActionHistory(prev => [{ item, direction }, ...prev].slice(0, 10));
    setSwipedKeys(prev => new Set(prev).add(item.ratingKey));

    // Create a local copy to update state reactively
    const updatedItem = { ...item };
    updatedItem.Label = [...(updatedItem.Label || updatedItem.Labels || [])];
    updatedItem.Collection = [...(updatedItem.Collection || [])];

    const additions: { type: 'label' | 'collection', value: string }[] = [];
    const removals: { type: 'label' | 'collection', value: string }[] = [];

    try {
      for (const action of config.actions) {
        if (action.type === 'add_label') {
          additions.push({ type: 'label', value: action.value });
          if (!updatedItem.Label.some(l => l.tag.toLowerCase() === action.value.toLowerCase())) {
            updatedItem.Label.push({ tag: action.value });
          }
        }
        else if (action.type === 'remove_label') {
          removals.push({ type: 'label', value: action.value });
          updatedItem.Label = updatedItem.Label.filter(l => l.tag.toLowerCase() !== action.value.toLowerCase());
        }
        else if (action.type === 'add_collection') {
          additions.push({ type: 'collection', value: action.value });
          if (!updatedItem.Collection.some(c => c.tag.toLowerCase() === action.value.toLowerCase())) {
            updatedItem.Collection.push({ tag: action.value });
          }
        }
        else if (action.type === 'remove_collection') {
          removals.push({ type: 'collection', value: action.value });
          updatedItem.Collection = updatedItem.Collection.filter(c => c.tag.toLowerCase() !== action.value.toLowerCase());
        }
        else if (action.type === 'ignore') {
          const expiry = action.days === 0 ? Infinity : Date.now() + (action.days || 0) * 24 * 60 * 60 * 1000;
          const newIgnoreList = { ...ignoreList, [item.ratingKey]: expiry };
          setIgnoreList(newIgnoreList);
          localStorage.setItem('ignore_list', JSON.stringify(newIgnoreList));
        }
      }

      // Execute batch API call
      if (additions.length > 0 || removals.length > 0) {
        await plexService.updateTags(item.ratingKey, additions, removals);
      }

      // Update local state to trigger filter and label dropdown updates
      setAllItems(prev => prev.map(i => i.ratingKey === item.ratingKey ? updatedItem : i));

    } catch (err) {
      console.error(`Failed to execute actions for ${direction} on ${item.title}:`, err);
    }
  };

  const handleUndo = async () => {
    if (actionHistory.length === 0 || !plexService) return;

    const lastAction = actionHistory[0];
    const { item, direction } = lastAction;
    const config = swipeConfig[direction as keyof SwipeConfig];

    // Remove from history immediately for responsiveness
    setActionHistory(prev => prev.slice(1));
    setSwipedKeys(prev => {
      const next = new Set(prev);
      next.delete(item.ratingKey);
      return next;
    });

    const additions: { type: 'label' | 'collection', value: string }[] = [];
    const removals: { type: 'label' | 'collection', value: string }[] = [];

    try {
      // 1. Reverse actions logic
      for (const action of config.actions) {
        if (action.type === 'add_label') {
          removals.push({ type: 'label', value: action.value });
        } else if (action.type === 'remove_label') {
          additions.push({ type: 'label', value: action.value });
        } else if (action.type === 'add_collection') {
          removals.push({ type: 'collection', value: action.value });
        } else if (action.type === 'remove_collection') {
          additions.push({ type: 'collection', value: action.value });
        }
      }

      // 2. Execute batch API call to restore original state
      if (additions.length > 0 || removals.length > 0) {
        await plexService.updateTags(item.ratingKey, additions, removals);
      }

      // 3. Handle local ignore list removal
      if (config.actions.some(a => a.type === 'ignore')) {
        setIgnoreList(prev => {
          const next = { ...prev };
          delete next[item.ratingKey];
          localStorage.setItem('ignore_list', JSON.stringify(next));
          return next;
        });
      }

      // 4. Restore item to the items list (reverting local metadata changes)
      setAllItems(prev => prev.map(i => i.ratingKey === item.ratingKey ? item : i));

    } catch (err) {
      console.error('Failed to undo action:', err);
    }
  };

  const handleSaveSettings = (url: string, token: string, newSwipeConfig: SwipeConfig) => {
    if (url && token) {
      localStorage.setItem('plex_server_url', url);
      localStorage.setItem('plex_token', token);
      setConfig({ serverUrl: url, token: token });
    } else {
      localStorage.removeItem('plex_server_url');
      localStorage.removeItem('plex_token');
      setConfig(null);
    }

    localStorage.setItem('swipe_config', JSON.stringify(newSwipeConfig));
    setSwipeConfig(newSwipeConfig);
    setIsSettingsOpen(false);
    setSelectedLibrary(null);
    setLibraries([]);
    setAllItems([]);
    setItems([]);
  };

  const handleClearData = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('ignore_list');
      setIgnoreList({});
      setSwipedKeys(new Set());
      setAllItems([]);
      setItems([]);
      setSelectedLibrary(null);
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to clear data:', err);
      setError('Failed to clear local data.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSelection = () => {
    setSelectedLibrary(null);
    setSwipedKeys(new Set());
    setAllItems([]);
    setItems([]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center">
      {!isSettingsOpen && (
        <>
          <header className="w-full max-w-4xl p-4 flex justify-between items-center z-20 sticky top-0 bg-zinc-950/80 backdrop-blur-md">
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

          <main className="w-full flex-grow flex flex-col items-center overflow-y-auto">
            {error && (
              <div className="max-w-md w-full px-4 pt-4">
                <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-center">
                  {error}
                </div>
              </div>
            )}

            {!config ? (
              <div className="flex-grow flex items-center justify-center text-center px-4">
                <div className="animate-in fade-in zoom-in duration-500">
                  <div className="bg-orange-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12">
                    <SettingsIcon className="w-10 h-10 text-orange-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to PlexSwipe</h2>
                  <p className="text-zinc-400 mb-8 max-w-xs mx-auto">Connect your Plex server to start managing your library with simple swipe actions.</p>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                  >
                    Configure Settings
                  </button>
                </div>
              </div>
            ) : !selectedLibrary ? (
              <div className="w-full max-w-md px-4 pt-8">
                <LibrarySelector
                  libraries={libraries}
                  onSelect={handleSelectLibrary}
                  isLoading={isLoading}
                />
              </div>
            ) : isLoading ? (
              <div className="flex-grow flex flex-col items-center justify-center space-y-8">
                <CardSkeleton />
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-zinc-500 text-sm font-medium">Loading {selectedLibrary.title}...</p>
                </div>
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col items-center min-h-0">
                {/* Filter Bar */}
                <div className="w-full max-w-md px-4 pb-4 animate-in slide-in-from-top duration-300">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Label
                      </label>
                      <select
                        value={filterLabel}
                        onChange={(e) => {
                          setFilterLabel(e.target.value);
                          setSwipedKeys(new Set());
                          setActionHistory([]);
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        <option value="all">All Labels</option>
                        <option value="unlabeled">Unlabeled (New)</option>
                        {availableLabels.length > 0 && <optgroup label="Specific Label">
                          {availableLabels.map(l => <option key={l} value={l}>{l}</option>)}
                        </optgroup>}
                      </select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Collection
                      </label>
                      <select
                        value={filterCollection}
                        onChange={(e) => {
                          setFilterCollection(e.target.value);
                          setSwipedKeys(new Set());
                          setActionHistory([]);
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        <option value="all">All Collections</option>
                        <option value="none">No Collection (New)</option>
                        {availableCollections.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>

                    </div>
                  </div>

                  <div className="flex justify-between items-center px-1 mt-2">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                      {items.length} {items.length === 1 ? 'item' : 'items'} remaining
                    </span>
                    {actionHistory.length > 0 && (
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                        Last: {actionHistory[0].direction}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full flex-1 relative flex flex-col items-center">
                  {plexService && (
                    <CardStack
                      key={`${selectedLibrary?.key}-${filterLabel}-${filterCollection}`}
                      items={items}
                      plexService={plexService}
                      onAction={handleAction}
                      onUndo={handleUndo}
                      canUndo={actionHistory.length > 0}
                      swipeConfig={swipeConfig}
                    />
                  )}

                  {items.length === 0 && !isLoading && (
                    <div className="text-center p-8 animate-in fade-in zoom-in duration-500">
                      <div className="bg-zinc-900/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Filter className="w-8 h-8 text-zinc-700" />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-300">No items match filters</h3>
                      <p className="text-zinc-500 text-sm mt-1">Try changing your filters or library selection.</p>
                      <button
                        onClick={() => { setFilterLabel('unlabeled'); setFilterCollection('none'); }}
                        className="mt-6 text-orange-500 text-sm font-semibold hover:underline"
                      >
                        Reset all filters
                      </button>

                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {isSettingsOpen && (
        <SettingsView
          onSave={handleSaveSettings}
          onClearData={handleClearData}
          onClose={() => setIsSettingsOpen(false)}
          initialUrl={config?.serverUrl || ''}
          initialToken={config?.token || ''}
          initialSwipeConfig={swipeConfig}
        />
      )}
    </div>
  )
}

export default App
