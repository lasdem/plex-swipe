import { useState, useMemo, createRef } from 'react';
import SwipeCard from './SwipeCard';
import { PlexService, type PlexMediaItem } from '../services/plexApi';
import { X, Heart, Star, RotateCcw } from 'lucide-react';

interface CardStackProps {
  items: PlexMediaItem[];
  plexService: PlexService;
  onAction: (item: PlexMediaItem, direction: string) => void;
}

const CardStack = ({ items, plexService, onAction }: CardStackProps) => {
  const [currentIndex, setCurrentIndex] = useState(items.length - 1);
  
  // Create refs for all items to trigger manual swipes
  const cardRefs = useMemo(
    () => 
      Array(items.length)
        .fill(0)
        .map(() => createRef<any>()),
    [items]
  );

  const handleSwipe = (direction: string, item: PlexMediaItem) => {
    onAction(item, direction);
  };

  const handleCardLeftScreen = () => {
    setCurrentIndex((prev) => prev - 1);
  };

  const handleManualSwipe = (direction: string) => {
    if (currentIndex >= 0 && currentIndex < items.length) {
      cardRefs[currentIndex].current?.swipe(direction);
    }
  };

  // Only show the top few cards for performance
  const visibleItems = useMemo(() => {
    return items.slice(Math.max(0, currentIndex - 2), currentIndex + 1);
  }, [items, currentIndex]);

  if (currentIndex < 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
        <div className="p-6 bg-zinc-900 rounded-full">
          <RotateCcw className="w-12 h-12 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold">All caught up!</h2>
        <p className="text-zinc-400 text-center px-6">You've swiped through all items in this library.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] flex flex-col items-center justify-between">
      {/* Cards Area */}
      <div className="relative w-full flex-grow">
        {visibleItems.map((item) => {
          const itemIndex = items.findIndex(i => i.ratingKey === item.ratingKey);
          return (
            <SwipeCard
              key={item.ratingKey}
              item={item}
              posterUrl={plexService.getTranscodedPhotoUrl(item.thumb)}
              onSwipe={(dir) => handleSwipe(dir, item)}
              onCardLeftScreen={handleCardLeftScreen}
              cardRef={cardRefs[itemIndex]}
            />
          );
        })}
      </div>

      {/* Buttons Area */}
      <div className="flex items-center justify-center gap-6 pb-8 w-full">
        <button
          onClick={() => handleManualSwipe('left')}
          className="p-4 bg-zinc-900 border border-zinc-800 rounded-full text-red-500 hover:scale-110 active:scale-95 transition-all shadow-xl"
        >
          <X className="w-8 h-8" strokeWidth={3} />
        </button>
        
        <button
          onClick={() => handleManualSwipe('up')}
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-blue-400 hover:scale-110 active:scale-95 transition-all shadow-xl"
        >
          <Star className="w-6 h-6" fill="currentColor" />
        </button>
        
        <button
          onClick={() => handleManualSwipe('right')}
          className="p-4 bg-zinc-900 border border-zinc-800 rounded-full text-green-500 hover:scale-110 active:scale-95 transition-all shadow-xl"
        >
          <Heart className="w-8 h-8" fill="currentColor" />
        </button>
      </div>
    </div>
  );
};

export default CardStack;
