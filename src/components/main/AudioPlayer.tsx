import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  label?: string;
  duration?: number | string | null;
  tone?: 'light' | 'dark';
  compact?: boolean;
}

const parseDurationValue = (value?: number | string | null) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
      return Math.max(0, Number(trimmed));
    }

    const parts = trimmed.split(':').map((part) => Number(part));
    if (parts.every((part) => Number.isFinite(part))) {
      return parts.reduce((total, part) => total * 60 + part, 0);
    }
  }

  return 0;
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const AudioPlayer = ({ src, label = 'Voice note', duration, tone = 'light', compact = false }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedDuration, setResolvedDuration] = useState(parseDurationValue(duration));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const fallbackDuration = parseDurationValue(duration);
    setCurrentTime(0);
    setResolvedDuration(fallbackDuration);
    setIsPlaying(false);
    audio.pause();
    audio.currentTime = 0;

    const handleLoadedMetadata = () => {
      setResolvedDuration(audio.duration && Number.isFinite(audio.duration) ? audio.duration : fallbackDuration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [duration, src]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  const sliderMax = resolvedDuration > 0 ? resolvedDuration : Math.max(currentTime, 1);
  const elapsedLabel = formatDuration(currentTime);
  const durationLabel = formatDuration(resolvedDuration || parseDurationValue(duration));
  const shellTone =
    tone === 'dark'
      ? 'border border-white/10 bg-white/12 text-white'
      : 'border border-border/80 bg-panel-muted text-text-primary';
  const buttonTone = tone === 'dark' ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-white text-text-primary hover:bg-slate-50';
  const trackAccent = tone === 'dark' ? '#ffffff' : '#2563eb';
  const metaTone = tone === 'dark' ? 'text-white/72' : 'text-text-secondary';

  return (
    <div className={`rounded-[22px] px-3 py-3 ${shellTone}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          className={`flex ${compact ? 'h-10 w-10' : 'h-11 w-11'} shrink-0 items-center justify-center rounded-full shadow-sm transition ${buttonTone}`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          {!compact && <div className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${metaTone}`}>{label}</div>}
          <div className="flex items-center gap-2.5">
            <span className={`w-10 shrink-0 text-[11px] font-medium tabular-nums ${metaTone}`}>{elapsedLabel}</span>
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={0.1}
              value={Math.min(currentTime, sliderMax)}
              onChange={(event) => {
                const nextTime = Number(event.target.value);
                setCurrentTime(nextTime);
                if (audioRef.current) {
                  audioRef.current.currentTime = nextTime;
                }
              }}
              className="h-1.5 w-full cursor-pointer accent-current"
              style={{ accentColor: trackAccent }}
            />
            <span className={`w-10 shrink-0 text-right text-[11px] font-medium tabular-nums ${metaTone}`}>{durationLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
