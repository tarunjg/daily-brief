'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, Volume2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BriefItem {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
}

interface Props {
  items: BriefItem[];
  digestDate: string;
}

type AudioMode = 'elevenlabs' | 'webspeech' | 'loading';

export function BriefAudioPlayer({ items, digestDate }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  const [showAmbientControl, setShowAmbientControl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ambientAvailable, setAmbientAvailable] = useState(true);
  const [audioMode, setAudioMode] = useState<AudioMode>('loading');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);

  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const webSpeechItemIndex = useRef(0);

  // Initialize and check if ElevenLabs is available
  useEffect(() => {
    // Try to generate audio with ElevenLabs
    checkElevenLabsAvailability();
  }, []);

  const checkElevenLabsAvailability = async () => {
    try {
      const res = await fetch('/api/tts/voices');
      if (res.ok) {
        setAudioMode('elevenlabs');
      } else {
        setAudioMode('webspeech');
      }
    } catch {
      setAudioMode('webspeech');
    }
  };

  // Initialize ambient audio
  useEffect(() => {
    const audio = new Audio('/audio/lofi-ambient.mp3');
    audio.loop = true;
    audio.volume = ambientVolume;

    audio.onerror = () => {
      setAmbientAvailable(false);
    };

    ambientAudioRef.current = audio;

    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current = null;
      }
    };
  }, []);

  // Update ambient volume
  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = ambientVolume;
    }
  }, [ambientVolume]);

  // Generate ElevenLabs audio
  const generateElevenLabsAudio = useCallback(async () => {
    if (audioUrl) return audioUrl; // Already generated

    setGeneratingAudio(true);
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, digestDate }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.fallbackToWebSpeech) {
          setAudioMode('webspeech');
          return null;
        }
        throw new Error('Failed to generate audio');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Create audio element
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        setDuration(Math.ceil(audio.duration));
      });
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(Math.floor(audio.currentTime));
      });
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (ambientAudioRef.current) {
          ambientAudioRef.current.pause();
          ambientAudioRef.current.currentTime = 0;
        }
      });
      mainAudioRef.current = audio;

      return url;
    } catch (error) {
      console.error('ElevenLabs generation failed:', error);
      toast.error('Using browser voice (ElevenLabs unavailable)');
      setAudioMode('webspeech');
      return null;
    } finally {
      setGeneratingAudio(false);
    }
  }, [items, digestDate, audioUrl]);

  // Estimate duration for web speech
  useEffect(() => {
    if (audioMode === 'webspeech') {
      const fullText = buildFullText();
      const wordCount = fullText.split(/\s+/).length;
      const estimatedSeconds = Math.ceil((wordCount / 150) * 60);
      setDuration(estimatedSeconds);
    }
  }, [audioMode, items, digestDate]);

  const buildFullText = () => {
    const intro = `Your Daily Brief for ${digestDate}. You have ${items.length} items today.`;
    const itemTexts = items.map((item, i) =>
      `Item ${i + 1}: ${item.title}. ${item.summary}. Why it matters for you: ${item.whyItMatters}`
    ).join(' ');
    return `${intro} ${itemTexts}`;
  };

  // Web Speech API playback
  const playWithWebSpeech = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      toast.error('Speech synthesis not supported in this browser');
      return;
    }

    window.speechSynthesis.cancel();

    const text = buildFullText();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('Google') ||
      v.name.includes('Samantha') ||
      v.name.includes('Daniel') ||
      (v.lang.startsWith('en') && v.name.includes('Premium'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current.currentTime = 0;
      }
    };

    utterance.onerror = (event) => {
      if (event.error !== 'canceled') {
        console.error('Speech error:', event);
        setIsPlaying(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [items, digestDate]);

  // Toggle playback
  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      // Pause
      if (audioMode === 'elevenlabs' && mainAudioRef.current) {
        mainAudioRef.current.pause();
      } else {
        window.speechSynthesis.cancel();
      }
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      // Play
      setIsLoading(true);

      // Start ambient music
      if (ambientAudioRef.current && ambientVolume > 0 && ambientAvailable) {
        ambientAudioRef.current.play().catch(() => setAmbientAvailable(false));
      }

      if (audioMode === 'elevenlabs') {
        // Generate audio if not already done
        const url = await generateElevenLabsAudio();
        if (url && mainAudioRef.current) {
          mainAudioRef.current.play();
          setIsPlaying(true);
        } else if (!url) {
          // ElevenLabs failed, fallback to web speech
          const startSpeaking = () => {
            playWithWebSpeech();
            setIsPlaying(true);
          };

          if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = startSpeaking;
          } else {
            startSpeaking();
          }
        }
      } else {
        // Use Web Speech API
        const startSpeaking = () => {
          playWithWebSpeech();
          setIsPlaying(true);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = startSpeaking;
        } else {
          startSpeaking();
        }
      }

      setIsLoading(false);
    }
  }, [isPlaying, audioMode, ambientVolume, ambientAvailable, generateElevenLabsAudio, playWithWebSpeech]);

  // Seek (for ElevenLabs audio only)
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (mainAudioRef.current) {
      mainAudioRef.current.currentTime = newTime;
    }
  };

  // Skip forward/back 15 seconds
  const skip = (seconds: number) => {
    if (audioMode === 'elevenlabs' && mainAudioRef.current) {
      const newTime = Math.max(0, Math.min(duration, mainAudioRef.current.currentTime + seconds));
      mainAudioRef.current.currentTime = newTime;
      setCurrentTime(Math.floor(newTime));
    }
  };

  // Format time as m:ss
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Cleanup
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (mainAudioRef.current) {
        mainAudioRef.current.pause();
        mainAudioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="bg-brand-900 rounded-2xl p-4 shadow-lg mb-6">
      <div className="flex items-center gap-3">
        {/* Skip back */}
        <button
          onClick={() => skip(-15)}
          disabled={audioMode !== 'elevenlabs' || !audioUrl}
          className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center
                    text-brand-300 hover:text-white hover:bg-brand-700
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Skip back 15 seconds"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlayback}
          disabled={isLoading || generatingAudio}
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center
                    text-brand-900 hover:bg-brand-100 transition-colors shadow-md"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading || generatingAudio ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Skip forward */}
        <button
          onClick={() => skip(15)}
          disabled={audioMode !== 'elevenlabs' || !audioUrl}
          className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center
                    text-brand-300 hover:text-white hover:bg-brand-700
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Skip forward 15 seconds"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Time and progress */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-sm text-brand-300 font-mono w-10 text-right flex-shrink-0">
            {formatTime(currentTime)}
          </span>

          {audioMode === 'elevenlabs' && audioUrl ? (
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-brand-800 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-brand-400"
            />
          ) : (
            <div className="flex-1 h-1.5 bg-brand-800 rounded-full overflow-hidden min-w-0">
              <div
                className="h-full bg-brand-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          <span className="text-sm text-brand-300 font-mono w-10 flex-shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        {/* Ambient control */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowAmbientControl(!showAmbientControl)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                      ${ambientVolume > 0 && ambientAvailable
                        ? 'bg-brand-700 text-brand-200'
                        : 'bg-brand-800 text-brand-400'}`}
            aria-label="Ambient music controls"
          >
            <Music className="w-4 h-4" />
          </button>

          {showAmbientControl && (
            <div className="absolute bottom-full right-0 mb-2 p-3 bg-white rounded-xl shadow-lg
                          border border-surface-200 w-48 z-10">
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-surface-500" />
                <span className="text-sm font-medium text-surface-700">Ambient</span>
              </div>
              {ambientAvailable ? (
                <>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                  <div className="flex justify-between text-xs text-surface-400 mt-1">
                    <span>Off</span>
                    <span>Max</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-surface-400">
                  Add lofi-ambient.mp3 to /public/audio/
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="mt-3 flex items-center gap-2">
        <Volume2 className="w-3.5 h-3.5 text-brand-400" />
        <span className="text-xs text-brand-300">
          {generatingAudio
            ? 'Generating audio with ElevenLabs...'
            : isPlaying
              ? `Playing ${items.length} items`
              : audioMode === 'elevenlabs'
                ? `${items.length} items · ElevenLabs voice`
                : `${items.length} items · Browser voice`
          }
        </span>
      </div>
    </div>
  );
}
