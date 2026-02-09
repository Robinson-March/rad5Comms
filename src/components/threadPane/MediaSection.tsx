// components/thread-pane/MediaSection.tsx
import { ImageIcon } from 'lucide-react';

interface MediaSectionProps {
  media?: string[]; // array of image URLs (passed from selectedChat.media)
}

const MediaSection = ({ media = [] }: MediaSectionProps) => {
  if (media.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">No media yet</p>
        <p className="text-sm mt-1">Photos and videos shared here will appear</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-200 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Media ({media.length})
        </h4>
        {media.length > 6 && (
          <button className="text-blue hover:underline text-xs">View All</button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {media.slice(0, 6).map((url, i) => (
          <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
            <img
              src={url}
              alt={`Media ${i + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
              onClick={() => window.open(url, '_blank')} // optional: open full image
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaSection;