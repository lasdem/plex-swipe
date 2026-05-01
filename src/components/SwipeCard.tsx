import TinderCard from 'react-tinder-card';
import type { PlexMediaItem } from '../services/plexApi';

interface SwipeCardProps {
  item: PlexMediaItem;
  posterUrl: string;
  onSwipe: (direction: string) => void;
  onCardLeftScreen: () => void;
  cardRef?: React.RefObject<any>;
}

const SwipeCard = ({ item, posterUrl, onSwipe, onCardLeftScreen, cardRef }: SwipeCardProps) => {
  const itemLabels = item.Label || (item as any).Labels || [];
  const requester = itemLabels.find((l: any) => l.tag.startsWith('Requested by:'))?.tag.replace('Requested by:', '').trim();
  const labels = itemLabels.filter((l: any) => !l.tag.startsWith('Requested by:')) || [];
  const collections = item.Collection || [];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <TinderCard
        ref={cardRef}
        className="swipe-card pointer-events-auto"
        onSwipe={onSwipe}
        onCardLeftScreen={onCardLeftScreen}
        swipeRequirementType="position"
        swipeThreshold={80}
      >
        <div 
          className="relative w-[85vw] max-w-[340px] aspect-[2/3] max-h-full bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col"
          style={{
            backgroundImage: `url(${posterUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          
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
              {labels.map((l: any, i: number) => (
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
        </div>
      </TinderCard>
    </div>
  );
};

export default SwipeCard;
