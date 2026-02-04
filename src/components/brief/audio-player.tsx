'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2, Music, SkipBack, SkipForward } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  digestId: string;
  audioUrl: string | null;
  briefDate: string;
}

export function AudioPlayer({ digestId, audioUrl: initialAudioUrl, briefDate }: Props) {
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lofiEnabled, setLofiEnabled] = useState(true);
  const [lofiVolume, setLofiVolume] = useState(0.15);

  const audioRef = useRef<HTMLAudioElement>(null);
  const lofiRef = useRef<HTMLAudioElement>(null);

  // Lo-fi ambient track (royalty-free)
  const lofiTrackUrl = 'https://cdn.pixabay.com/audio/2024/02/14/audio_93ae27c867.mp3';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      if (lofiRef.current) {
        lofiRef.current.pause();
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (lofiRef.current) {
      lofiRef.current.volume = lofiVolume;
    }
  }, [lofiVolume]);

  const generateAudio = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digestId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate audio');
      }

      const { audioUrl: newUrl } = await response.json();
      setAudioUrl(newUrl);
      toast.success('Audio brief ready!');
    } catch (error) {
      console.error('Audio generation error:', error);
      toast.error('Failed to generate audio. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    const lofi = lofiRef.current;

    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      if (lofi) lofi.pause();
    } else {
      audio.play();
      if (lofi && lofiEnabled) {
        lofi.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleLofi = () => {
    const lofi = lofiRef.current;
    if (!lofi) return;

    if (lofiEnabled) {
      lofi.pause();
    } else if (isPlaying) {
      lofi.play();
    }
    setLofiEnabled(!lofiEnabled);
  };

  // No audio yet - show generate button
  if (!audioUrl) {
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-[#1E3A5F]/5 to-[#E85D4C]/5 rounded-2xl border border-surface-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-[#1E3A5F]" />
            </div>
            <div>
              <p className="font-medium text-surface-900 text-sm">Listen to your brief</p>
              <p className="text-xs text-surface-500">Perfect for your morning routine</p>
            </div>
          </div>
          <button
            onClick={generateAudio}
            disabled={isGenerating}
            className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Audio
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Audio player
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-[#1E3A5F] to-[#2D4A6F] rounded-2xl text-white">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <audio ref={lofiRef} src={lofiTrackUrl} loop preload="metadata" />

      <div className="flex items-center gap-4">
        {/* Play controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => seek(-15)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Back 15s"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-white text-[#1E3A5F] flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => seek(15)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Forward 15s"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/70 w-10">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-white/70 w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Lo-fi toggle */}
        <button
          onClick={toggleLofi}
          className={`p-2 rounded-lg transition-colors ${
            lofiEnabled ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'
          }`}
          title={lofiEnabled ? 'Disable ambient music' : 'Enable ambient music'}
        >
          <Music className="w-4 h-4" />
        </button>
      </div>

      {/* Lo-fi volume slider (only when enabled) */}
      {lofiEnabled && (
        <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
          <Music className="w-3 h-3" />
          <span>Ambient</span>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.01"
            value={lofiVolume}
            onChange={(e) => setLofiVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5
                     [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white"
          />
        </div>
      )}
    </div>
  );
}
