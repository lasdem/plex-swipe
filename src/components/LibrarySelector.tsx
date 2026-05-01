import type { PlexLibrary } from '../services/plexApi';
import { Film, Tv, LayoutGrid } from 'lucide-react';

interface LibrarySelectorProps {
  libraries: PlexLibrary[];
  onSelect: (library: PlexLibrary) => void;
  isLoading: boolean;
}

const LibrarySelector = ({ libraries, onSelect, isLoading }: LibrarySelectorProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-400">Fetching libraries...</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Film className="w-6 h-6" />;
      case 'show': return <Tv className="w-6 h-6" />;
      default: return <LayoutGrid className="w-6 h-6" />;
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Select a Library</h2>
      <div className="grid gap-3">
        {libraries.map((lib) => (
          <button
            key={lib.key}
            onClick={() => onSelect(lib)}
            className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500 hover:bg-zinc-800 transition-all text-left group"
          >
            <div className="p-3 bg-zinc-800 rounded-lg group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors">
              {getIcon(lib.type)}
            </div>
            <div>
              <div className="font-semibold text-zinc-100">{lib.title}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">{lib.type}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LibrarySelector;
