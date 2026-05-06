import { useState, useEffect, useMemo, createRef } from 'react';
import SwipeCard from './SwipeCard';
import { PlexService, type PlexMediaItem } from '../services/plexApi';
import { RotateCcw } from 'lucide-react';
import { type SwipeConfig, AVAILABLE_ICONS } from '../App';

interface CardStackProps {
  items: PlexMediaItem[];
  plexService: PlexService;
  onAction: (item: PlexMediaItem, direction: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  swipeConfig: SwipeConfig;
}

interface TinderCardRef {
  swipe: (dir?: string) => Promise<void>;
  restoreCard: () => Promise<void>;
}

const CardStack = ({ items, plexService, onAction, onUndo, canUndo, swipeConfig }: CardStackProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [flyingCards, setFlyingCards] = useState<Record<string, string>>({});

  const activeIndex = items.length - 1 - swipeOffset;

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        onUndo();
        return;
      }

      if (e.key === 'Backspace') {
        onUndo();
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          handleManualSwipe('left');
          break;
        case 'ArrowRight':
          handleManualSwipe('right');
          break;
        case 'ArrowUp':
          handleManualSwipe('up');
          break;
        case 'ArrowDown':
          handleManualSwipe('down');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, items, onUndo]); 

  // Create refs for all items to trigger manual swipes
  const cardRefs = useMemo(
    () => 
      Array(items.length)
        .fill(0)
        .map(() => createRef<TinderCardRef | null>()),
    [items]
  );

  const handleSwipe = (direction: string, item: PlexMediaItem) => {
    setFlyingCards(prev => ({ ...prev, [item.ratingKey]: direction }));
    setSwipeOffset(prev => prev + 1);
  };

  const handleCardLeftScreen = (item: PlexMediaItem, dir: string) => {
    onAction(item, dir);
    setFlyingCards(prev => {
      const next = { ...prev };
      delete next[item.ratingKey];
      return next;
    });
    setSwipeOffset(prev => Math.max(0, prev - 1));
  };

  const handleManualSwipe = (direction: string) => {
    if (activeIndex >= 0 && activeIndex < items.length) {
      cardRefs[activeIndex].current?.swipe(direction);
    }
  };

  // Show top few cards plus any currently flying cards
  const visibleItems = useMemo(() => {
    const start = Math.max(0, activeIndex - 2);
    return items.slice(start, items.length);
  }, [items, activeIndex]);

  const renderSwipeButton = (direction: 'left' | 'right' | 'up' | 'down') => {
    const config = swipeConfig[direction];
    const iconKey = config.icon as keyof typeof AVAILABLE_ICONS;
    const IconComp = AVAILABLE_ICONS[iconKey]?.component || AVAILABLE_ICONS.ArrowUp.component;
    
    const isSmall = direction === 'up' || direction === 'down';
    const isUnavailable = activeIndex < 0;

    return (
      <button
        onClick={() => handleManualSwipe(direction)}
        disabled={isUnavailable}
        className={`${isSmall ? 'p-3' : 'p-4'} bg-zinc-900 border border-zinc-800 rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl hover:border-zinc-600 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed`}
        style={{ color: isUnavailable ? '#3f3f46' : config.color }}
      >
        <IconComp className={isSmall ? "w-6 h-6" : "w-8 h-8"} strokeWidth={isSmall ? 2.5 : 3} />
      </button>
    );
  };

  if (items.length === 0 && activeIndex < 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
        <div className="p-6 bg-zinc-900 rounded-full">
          <RotateCcw className="w-12 h-12 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold">All caught up!</h2>
        <p className="text-zinc-400 text-center px-6">You've swiped through all items in this library.</p>
        {canUndo && (
          <button 
            onClick={onUndo}
            className="mt-4 flex items-center gap-2 text-orange-500 font-bold hover:underline"
          >
            <RotateCcw className="w-4 h-4" /> Undo last action
          </button>
        )}
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
              onCardLeftScreen={(dir) => handleCardLeftScreen(item, dir)}
              cardRef={cardRefs[itemIndex]}
              isFlying={!!flyingCards[item.ratingKey]}
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
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2 bg-zinc-900 border border-zinc-800 rounded-full transition-all shadow-lg ${
                canUndo ? 'text-zinc-400 hover:text-white hover:border-zinc-600 scale-100' : 'text-zinc-800 opacity-50 scale-90'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            {renderSwipeButton('down')}
          </div>
          {renderSwipeButton('right')}
        </div>
      </div>
    </div>
  );
};

export default CardStack;
