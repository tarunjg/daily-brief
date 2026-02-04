'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  digestId: string;
}

export function BriefAudioPlayer({ digestId }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  const [showAmbient, setShowAmbient] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);

  // Format time display
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Load audio
  const loadAudio = useCallback(async () => {
    if (audioRef.current) return; // Already loaded

    setIsLoading(true);
    setError(null);

    try {
      const audio = new Audio('/api/brief/audio');
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setAudioReady(true);
        setIsLoading(false);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
        audio.currentTime = 0;
        // Stop ambient music too
        if (ambientRef.current) {
          ambientRef.current.pause();
        }
      });

      audio.addEventListener('error', () => {
        setError('Failed to load audio. Text-to-speech may not be configured.');
        setIsLoading(false);
        setAudioReady(false);
      });

      audio.load();
    } catch (err) {
      setError('Failed to initialize audio player');
      setIsLoading(false);
    }
  }, []);

  // Load audio on mount
  useEffect(() => {
    loadAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (ambientRef.current) {
        ambientRef.current.pause();
        ambientRef.current = null;
      }
    };
  }, [loadAudio]);

  // Toggle play/pause
  const togglePlay = async () => {
    if (!audioRef.current) {
      await loadAudio();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      if (ambientRef.current) ambientRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
        // Start ambient music if enabled
        if (ambientRef.current && ambientVolume > 0) {
          ambientRef.current.volume = ambientVolume;
          ambientRef.current.play().catch(() => {});
        }
      } catch (err) {
        toast.error('Failed to play audio');
      }
    }
    setIsPlaying(!isPlaying);
  };

  // Skip forward/backward
  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  };

  // Seek to position
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Handle ambient volume change
  const handleAmbientVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setAmbientVolume(vol);
    if (ambientRef.current) {
      ambientRef.current.volume = vol;
    }
  };

  // Initialize ambient audio
  useEffect(() => {
    // Using a royalty-free ambient track URL
    // In production, you'd host this yourself or use a service
    const ambient = new Audio('/ambient-music.mp3');
    ambient.loop = true;
    ambient.volume = ambientVolume;
    ambientRef.current = ambient;

    return () => {
      if (ambientRef.current) {
        ambientRef.current.pause();
        ambientRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="bg-surface-800 rounded-2xl p-4 text-center">
        <p className="text-surface-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-800 rounded-2xl p-4 sm:p-5">
      {/* Main controls */}
      <div className="flex items-center gap-4">
        {/* Skip back */}
        <button
          onClick={() => skip(-15)}
          disabled={!audioReady}
          className="text-surface-400 hover:text-white transition-colors disabled:opacity-30"
          aria-label="Skip back 15 seconds"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center
                   hover:scale-105 transition-transform disabled:opacity-50"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-surface-800 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-surface-800" />
          ) : (
            <Play className="w-5 h-5 text-surface-800 ml-0.5" />
          )}
        </button>

        {/* Skip forward */}
        <button
          onClick={() => skip(15)}
          disabled={!audioReady}
          className="text-surface-400 hover:text-white transition-colors disabled:opacity-30"
          aria-label="Skip forward 15 seconds"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Time display */}
        <span className="text-sm text-surface-300 font-mono min-w-[40px]">
          {formatTime(currentTime)}
        </span>

        {/* Progress bar */}
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={!audioReady}
            className="w-full h-1.5 bg-surface-600 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
                     [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer
                     disabled:opacity-30"
            style={{
              background: `linear-gradient(to right, #94a3b8 ${(currentTime / (duration || 100)) * 100}%, #475569 ${(currentTime / (duration || 100)) * 100}%)`,
            }}
          />
        </div>

        {/* Duration */}
        <span className="text-sm text-surface-400 font-mono min-w-[40px]">
          {formatTime(duration)}
        </span>

        {/* Ambient music toggle */}
        <button
          onClick={() => setShowAmbient(!showAmbient)}
          className={`p-2 rounded-lg transition-colors ${
            showAmbient ? 'bg-surface-700 text-white' : 'text-surface-400 hover:text-white'
          }`}
          aria-label="Toggle ambient music settings"
        >
          <Music className="w-5 h-5" />
        </button>
      </div>

      {/* Ambient music controls */}
      {showAmbient && (
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-700">
          <Music className="w-4 h-4 text-surface-400" />
          <span className="text-xs text-surface-400 font-medium">Ambient</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={ambientVolume}
            onChange={handleAmbientVolume}
            className="w-24 h-1 bg-surface-600 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5
                     [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-surface-300 [&::-webkit-slider-thumb]:cursor-pointer"
          />
          {ambientVolume > 0 ? (
            <Volume2 className="w-4 h-4 text-surface-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-surface-400" />
          )}
        </div>
      )}
    </div>
  );
}
