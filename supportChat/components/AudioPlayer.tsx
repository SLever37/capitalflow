import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const AudioPlayer = ({
  src,
  duration
}: {
  src: string;
  duration?: number;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(duration || 0);

  useEffect(() => {
    // Quando muda o src, reseta UI
    setIsReady(false);
    setIsBuffering(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setTotalTime(duration || 0);

    const a = audioRef.current;
    if (!a) return;

    // força reload do elemento
    a.pause();
    a.currentTime = 0;
    a.load();
  }, [src, duration]);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;

    try {
      if (a.paused) {
        setIsBuffering(true);
        await a.play(); // onPlay sincroniza estado
      } else {
        a.pause(); // onPause sincroniza estado
      }
    } catch (err) {
      setIsPlaying(false);
      setIsBuffering(false);
      console.error('[AudioPlayer] play() falhou:', err);
    }
  };

  const onLoadedMetadata = () => {
    const a = audioRef.current;
    if (!a) return;
    const d = isFinite(a.duration) && a.duration > 0 ? a.duration : (duration || 0);
    setTotalTime(d);
    setIsReady(true);
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTime(a.currentTime || 0);
  };

  const onPlay = () => {
    setIsPlaying(true);
    setIsBuffering(false);
  };

  const onPause = () => {
    setIsPlaying(false);
    setIsBuffering(false);
  };

  const onEnded = () => {
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    const a = audioRef.current;
    if (a) a.currentTime = 0;
  };

  const onWaiting = () => setIsBuffering(true);
  const onCanPlay = () => setIsBuffering(false);

  const progress = totalTime > 0 ? Math.min(100, (currentTime / totalTime) * 100) : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !totalTime) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, x / rect.width));
    a.currentTime = pct * totalTime;
    setCurrentTime(a.currentTime);
  };

  return (
    <div className="flex items-center gap-3 bg-black/20 px-3 py-2 rounded-xl min-w-[240px] overflow-visible">
      {/* ✅ BOTÃO CORRIGIDO: maior, centralizado e sem corte */}
      <button
        onClick={togglePlay}
        type="button"
        aria-label={isPlaying ? 'Pausar áudio' : 'Tocar áudio'}
        disabled={!src}
        className="
          w-9 h-9
          min-w-[36px] min-h-[36px]
          bg-white text-black
          rounded-full
          flex items-center justify-center
          shrink-0
          overflow-visible
          hover:scale-105
          active:scale-95
          transition-transform
        "
      >
        {isBuffering ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isPlaying ? (
          <Pause size={16} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" className="ml-[1px]" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center h-full gap-1 min-w-0">
        <div
          className="h-1 bg-white/20 rounded-full w-full overflow-hidden cursor-pointer"
          onClick={seek}
          title="Clique para avançar/voltar"
        >
          <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex justify-between text-[8px] text-white/70 font-mono">
          <span className="truncate">
            {!isReady ? 'Carregando...' : isPlaying ? 'Ouvindo...' : 'Áudio'}
          </span>
          <span>
            {formatTime(currentTime)} / {formatTime(totalTime || 0)}
          </span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        playsInline
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onWaiting={onWaiting}
        onCanPlay={onCanPlay}
        className="hidden"
      />
    </div>
  );
};