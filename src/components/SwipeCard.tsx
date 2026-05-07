import { useState, useRef } from 'react';
import TinderCard from 'react-tinder-card';
import type { PlexMediaItem } from '../services/plexApi';
import { ImageOff, Check } from 'lucide-react';

interface TinderCardRef {
  swipe: (dir?: string) => Promise<void>;
  restoreCard: () => Promise<void>;
}

interface SwipeCardProps {
  item: PlexMediaItem;
  posterUrl: string;
  onSwipe: (direction: string) => void;
  onCardLeftScreen: (direction: string) => void;
  cardRef?: React.RefObject<TinderCardRef | null>;
  isFlying?: boolean;
}

const SwipeCard = ({ item, posterUrl, onSwipe, onCardLeftScreen, cardRef, isFlying }: SwipeCardProps) => {
  const [imgError, setImgError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  
  const itemLabels = item.Label || item.Labels || [];
  const requester = itemLabels.find((l) => l.tag.startsWith('Requested by:'))?.tag.replace('Requested by:', '').trim();
  const labels = itemLabels.filter((l) => !l.tag.startsWith('Requested by:')) || [];
  const collections = item.Collection || [];

  const getExternalId = (provider: 'imdb' | 'tmdb' | 'tvdb') => {
    // Modern Plex agents use the Guid array
    const modernId = item.Guid?.find(g => g.id.startsWith(`${provider}://`))?.id.replace(`${provider}://`, '');
    if (modernId) return modernId;
    
    // Legacy Plex agents use the main guid property (e.g. com.plexapp.agents.imdb://tt1234567?lang=en)
    const legacyProviderName = provider === 'tmdb' ? 'themoviedb' : provider === 'tvdb' ? 'thetvdb' : 'imdb';
    if (item.guid.includes(`agents.${legacyProviderName}://`)) {
      const match = item.guid.match(new RegExp(`agents\\.${legacyProviderName}://([^?]+)`));
      if (match) return match[1];
    }
    return null;
  };

  const imdbId = getExternalId('imdb');
  const tmdbId = getExternalId('tmdb');
  const tvdbId = getExternalId('tvdb');

  const handleCardClick = () => {
    setShowInfo(prev => !prev);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const dx = e.changedTouches[0].clientX - touchStartPos.current.x;
    const dy = e.changedTouches[0].clientY - touchStartPos.current.y;
    // If movement is less than 10 pixels, treat it as a tap
    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      handleCardClick();
    }
    touchStartPos.current = null;
  };

  const handleLinkTouchEnd = (e: React.TouchEvent, url: string) => {
    e.stopPropagation(); // Prevents the card from toggling info
    if (!touchStartPos.current) {
      window.open(url, '_blank');
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartPos.current.x;
    const dy = e.changedTouches[0].clientY - touchStartPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      window.open(url, '_blank');
    }
    touchStartPos.current = null;
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <TinderCard
        ref={cardRef}
        className="swipe-card pointer-events-auto"
        onSwipe={onSwipe}
        onCardLeftScreen={onCardLeftScreen}
        swipeRequirementType="position"
        swipeThreshold={50}
        preventSwipe={[]} // Don't prevent any swipes
      >
        <div 
          onClick={handleCardClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`relative w-[85vw] max-w-[340px] aspect-[2/3] max-h-full bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col transition-opacity duration-300 cursor-pointer ${isFlying ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        >
          {/* Poster Image or Fallback */}
          {!imgError ? (
            <img 
              src={posterUrl} 
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-700">
              <ImageOff className="w-12 h-12 mb-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Poster not found</span>
            </div>
          )}

          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
          
          {/* Watched Status Indicators */}
          {item.type === 'show' ? (
            // TV Show Logic
            (item.leafCount || 0) - (item.viewedLeafCount || 0) > 0 ? (
              <div className="absolute top-0 right-0 bg-zinc-900/95 text-white font-bold text-[13px] px-2 py-1 rounded-bl-md shadow z-20 flex items-center justify-center min-w-[32px] min-h-[32px]">
                {(item.leafCount || 0) - (item.viewedLeafCount || 0)}
              </div>
            ) : (item.leafCount && item.leafCount > 0 && (item.leafCount || 0) - (item.viewedLeafCount || 0) === 0) ? (
              <div className="absolute top-0 right-0 bg-zinc-900/95 text-white p-1 rounded-bl-md shadow z-20 flex items-center justify-center w-[32px] h-[32px]">
                <Check strokeWidth={4} className="w-4 h-4" />
              </div>
            ) : null
          ) : (
            // Movie Logic
            item.viewCount && item.viewCount > 0 ? (
              <div className="absolute top-0 right-0 bg-zinc-900/95 text-white p-1 rounded-bl-md shadow z-20 flex items-center justify-center w-[32px] h-[32px]">
                <Check strokeWidth={4} className="w-4 h-4" />
              </div>
            ) : null
          )}
          {(!item.viewCount && item.viewOffset !== undefined && item.viewOffset > 0 && item.duration > 0) && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20" title="Partially Watched">
              <div 
                className="h-full bg-orange-500" 
                style={{ width: `${Math.min(100, Math.max(0, (item.viewOffset / item.duration) * 100))}%` }} 
              />
            </div>
          )}

          <div className="absolute top-4 left-4 flex flex-col items-start gap-2 z-10">
            {requester && (
              <span className="bg-orange-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-lg">
                Req: {requester}
              </span>
            )}
            
            <div className="flex flex-wrap justify-start gap-1 max-w-[200px]">
              {collections.map((c: { tag: string }, i: number) => (
                <span key={i} className="bg-blue-600/80 text-white text-[9px] px-1.5 py-0.5 rounded border border-blue-400/30 whitespace-nowrap">
                  {c.tag}
                </span>
              ))}
              {labels.map((l, i) => (
                <span key={i} className="bg-zinc-800/80 text-zinc-200 text-[9px] px-1.5 py-0.5 rounded border border-zinc-700/50 whitespace-nowrap">
                  {l.tag}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
            <h3 className="text-xl font-bold text-white leading-tight mb-1">{item.title}</h3>
            <p className="text-zinc-300 text-sm">{item.year}</p>
          </div>

          {/* Info Overlay */}
          <div 
            className={`absolute inset-0 bg-zinc-900/95 p-6 flex flex-col z-30 transition-all duration-300 ${showInfo ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <div className="flex-1 overflow-y-auto pr-2 pb-4 no-scrollbar">
              <h3 className="text-2xl font-bold text-white mb-1">{item.title}</h3>
              <p className="text-orange-500 font-medium text-sm mb-4">
                {item.year} {item.duration ? `• ${Math.floor(item.duration / 60000)} min` : ''}
              </p>
              <p className="text-zinc-300 text-sm leading-relaxed">{item.summary}</p>
            </div>
            
            {(imdbId || tmdbId || tvdbId) && (
              <div className="pt-4 border-t border-zinc-800 flex flex-wrap gap-2 shrink-0">
                {imdbId && (
                  <a 
                    href={`https://www.imdb.com/title/${imdbId}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={e => e.stopPropagation()} 
                    onTouchEnd={e => handleLinkTouchEnd(e, `https://www.imdb.com/title/${imdbId}`)}
                    className="flex-1 bg-[#f5c518] hover:bg-[#e2b616] text-black px-3 py-2 rounded font-bold text-center text-sm transition-colors"
                  >
                    IMDb
                  </a>
                )}
                {tmdbId && (
                  <a 
                    href={`https://www.themoviedb.org/${item.type === 'movie' ? 'movie' : 'tv'}/${tmdbId}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={e => e.stopPropagation()} 
                    onTouchEnd={e => handleLinkTouchEnd(e, `https://www.themoviedb.org/${item.type === 'movie' ? 'movie' : 'tv'}/${tmdbId}`)}
                    className="flex-1 bg-[#01b4e4] hover:bg-[#019bc2] text-white px-3 py-2 rounded font-bold text-center text-sm transition-colors"
                  >
                    TMDb
                  </a>
                )}
                {tvdbId && (
                  <a 
                    href={`https://thetvdb.com/search?query=${tvdbId}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={e => e.stopPropagation()} 
                    onTouchEnd={e => handleLinkTouchEnd(e, `https://thetvdb.com/search?query=${tvdbId}`)}
                    className="flex-1 bg-[#00a350] hover:bg-[#008f46] text-white px-3 py-2 rounded font-bold text-center text-sm transition-colors"
                  >
                    TVDb
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </TinderCard>
    </div>
  );
};

export default SwipeCard;
