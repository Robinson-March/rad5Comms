import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Minus, Plus, RotateCcw, X } from 'lucide-react';

export interface MediaLightboxItem {
  url: string;
  name?: string;
  mimeType?: string | null;
  size?: number | null;
}

interface MediaLightboxModalProps {
  isOpen: boolean;
  items: MediaLightboxItem[];
  initialIndex?: number;
  onClose: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const MediaLightboxModal = ({ isOpen, items, initialIndex = 0, onClose }: MediaLightboxModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentIndex(clamp(initialIndex, 0, Math.max(items.length - 1, 0)));
    setZoom(1);
    setIsLoaded(false);
  }, [initialIndex, isOpen, items.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (items.length > 1 && event.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
        setZoom(1);
        setIsLoaded(false);
      }
      if (items.length > 1 && event.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setZoom(1);
        setIsLoaded(false);
      }
      if (event.key === '+' || event.key === '=') {
        setZoom((prev) => clamp(prev + 0.25, 1, 4));
      }
      if (event.key === '-') {
        setZoom((prev) => clamp(prev - 0.25, 1, 4));
      }
      if (event.key === '0') {
        setZoom(1);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, items.length, onClose]);

  const activeItem = items[currentIndex];

  const detailLabel = useMemo(() => {
    if (!activeItem) {
      return '';
    }

    return [activeItem.mimeType, formatFileSize(activeItem.size)].filter(Boolean).join(' • ') || 'Scroll or use buttons to zoom';
  }, [activeItem]);

  if (!isOpen || !activeItem || typeof document === 'undefined') {
    return null;
  }

  const navigate = (direction: -1 | 1) => {
    if (items.length <= 1) {
      return;
    }
    setCurrentIndex((prev) => (prev + direction + items.length) % items.length);
    setZoom(1);
    setIsLoaded(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[140]" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/88 backdrop-blur-md" />

      <div className="relative flex h-full w-full items-center justify-center px-3 py-6 sm:px-6">
        <div
          className="relative w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/95 shadow-[0_40px_120px_rgba(15,23,42,0.52)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-slate-200 sm:px-5">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{activeItem.name || `Media ${currentIndex + 1}`}</div>
              <div className="mt-0.5 truncate text-xs text-slate-400">
                {detailLabel}
                {items.length > 1 ? ` • ${currentIndex + 1} of ${items.length}` : ''}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((prev) => clamp(prev - 0.25, 1, 4))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((prev) => clamp(prev + 0.25, 1, 4))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <a
                href={activeItem.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_48%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]">
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/72 text-white shadow-lg transition hover:bg-slate-800"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(1)}
                  className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/72 text-white shadow-lg transition hover:bg-slate-800"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div
              className="flex max-h-[78vh] min-h-[320px] items-center justify-center overflow-auto p-4 sm:p-6"
              onWheel={(event) => {
                event.preventDefault();
                setZoom((prev) => clamp(prev + (event.deltaY < 0 ? 0.2 : -0.2), 1, 4));
              }}
            >
              {!isLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/82 text-sm text-slate-200">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white" />
                  <span>Loading image...</span>
                </div>
              )}

              <img
                src={activeItem.url}
                alt={activeItem.name || `Media ${currentIndex + 1}`}
                onLoad={() => setIsLoaded(true)}
                onDoubleClick={() => setZoom((prev) => (prev > 1 ? 1 : 2))}
className={`${zoom > 1 ? 'max-h-none max-w-none cursor-zoom-out' : 'max-h-[68vh] max-w-full cursor-zoom-in'} rounded-[24px] object-contain shadow-[0_28px_80px_rgba(15,23,42,0.42)] transition duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MediaLightboxModal;


