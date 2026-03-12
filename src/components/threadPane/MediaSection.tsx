// components/threadPane/MediaSection.tsx
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import MediaLightboxModal from '../main/MediaLightboxModal';

interface MediaItem {
  url: string;
  type?: string;
  name?: string;
  mimeType?: string | null;
  size?: number | null;
}

interface MediaSectionProps {
  media?: MediaItem[];
}

const MediaSection = ({ media = [] }: MediaSectionProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return media.length === 0 ? (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-soft text-blue">
        <ImageIcon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-base font-semibold text-text-primary">No media yet</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">Shared images and videos will appear here once the conversation gets moving.</p>
    </div>
  ) : (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-text-secondary">
          <ImageIcon className="h-4 w-4" />
          Media ({media.length})
        </h4>
        {media.length > 6 && (
          <button className="text-xs font-medium text-blue cursor-pointer" onClick={() => setActiveIndex(0)} type="button">
            View all
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {media.slice(0, 6).map((item, index) => (
          <button
            key={`${item.url}-${index}`}
            className="aspect-square overflow-hidden rounded-2xl bg-panel-muted cursor-pointer"
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <img src={item.url} alt={item.name || `Media ${index + 1}`} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
          </button>
        ))}
      </div>

      <MediaLightboxModal
        isOpen={activeIndex !== null}
        items={media.map((item, index) => ({
          url: item.url,
          name: item.name || `Media ${index + 1}`,
          mimeType: item.mimeType,
          size: item.size,
        }))}
        initialIndex={activeIndex ?? 0}
        onClose={() => setActiveIndex(null)}
      />
    </div>
  );
};

export default MediaSection;
