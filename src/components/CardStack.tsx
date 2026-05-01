import { useState, useEffect, useMemo, createRef } from 'react';
import SwipeCard from './SwipeCard';
import { PlexService, type PlexMediaItem } from '../services/plexApi';
import { RotateCcw } from 'lucide-react';
import { type SwipeConfig, AVAILABLE_ICONS } from '../App';

interface CardStackProps {
  items: PlexMediaItem[];
  plexService: PlexService;
  onAction: (item: PlexMediaItem, direction: string) => void;
  swipeConfig: SwipeConfig;
}

const CardStack = ({ items, plexService, onAction, swipeConfig }: CardStackProps) => {
  const [currentIndex, setCurrentIndex] = useState(items.length - 1);

  // Reset index when items change
  useEffect(() => {
    setCurrentIndex(items.length - 1);
  }, [items]);
  
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

  const renderSwipeButton = (direction: 'left' | 'right' | 'up' | 'down') => {
    const config = swipeConfig[direction];
    const iconKey = config.icon as keyof typeof AVAILABLE_ICONS;
    const IconComp = AVAILABLE_ICONS[iconKey]?.component || AVAILABLE_ICONS.ArrowUp.component;
    
    const isSmall = direction === 'up' || direction === 'down';

    return (
      <button
        onClick={() => handleManualSwipe(direction)}
        className={`${isSmall ? 'p-3' : 'p-4'} bg-zinc-900 border border-zinc-800 rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl`}
        style={{ color: config.color }}
      >
        <IconComp className={isSmall ? "w-6 h-6" : "w-8 h-8"} strokeWidth={isSmall ? 2.5 : 3} />
      </button>
    );
  };

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
    <div className="relative w-full flex-1 flex flex-col items-center justify-between min-h-0">
      {/* Cards Area */}
      <div className="relative w-full flex-grow min-h-0">
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
      <div className="flex flex-col items-center gap-4 pb-8 w-full z-10">
        <div className="flex items-center justify-center gap-6">
          {renderSwipeButton('left')}
          <div className="flex flex-col gap-4">
            {renderSwipeButton('up')}
            {renderSwipeButton('down')}
          </div>
          {renderSwipeButton('right')}
        </div>
      </div>
    </div>
  );
};

export default CardStack;
