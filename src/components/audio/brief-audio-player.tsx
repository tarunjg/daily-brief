'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, Volume2 } from 'lucide-react';

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

export function BriefAudioPlayer({ items, digestDate }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  const [showAmbientControl, setShowAmbientControl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ambientAvailable, setAmbientAvailable] = useState(true);

  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const isPausedRef = useRef(false);

  // Initialize ambient audio with fallback
  useEffect(() => {
    const audio = new Audio('/audio/lofi-ambient.mp3');
    audio.loop = true;
    audio.volume = ambientVolume;

    audio.onerror = () => {
      console.log('Ambient audio not available');
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

  // Build the text content for the current item
  const getItemText = useCallback((index: number): string => {
    if (index < 0 || index >= items.length) return '';
    const item = items[index];
    return `Item ${index + 1}: ${item.title}. ${item.summary}. Why it matters for you: ${item.whyItMatters}`;
  }, [items]);

  // Build full brief text for duration estimation
  const getFullBriefText = useCallback((): string => {
    const intro = `Your Daily Brief for ${digestDate}. You have ${items.length} items today.`;
    const itemTexts = items.map((_, i) => getItemText(i)).join(' ');
    return `${intro} ${itemTexts}`;
  }, [items, digestDate, getItemText]);

  // Estimate duration (average speaking rate ~150 words per minute)
  useEffect(() => {
    const fullText = getFullBriefText();
    const wordCount = fullText.split(/\s+/).length;
    const estimatedSeconds = Math.ceil((wordCount / 150) * 60);
    setDuration(estimatedSeconds);
  }, [getFullBriefText]);

  // Speak using Web Speech API
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to get a natural-sounding voice
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
      if (!isPausedRef.current) {
        onEnd?.();
      }
    };

    utterance.onerror = (event) => {
      if (event.error !== 'canceled') {
        console.error('Speech error:', event);
        setIsPlaying(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Play the intro
  const playIntro = useCallback(() => {
    const intro = `Your Daily Brief for ${digestDate}. You have ${items.length} items today.`;
    speak(intro, () => {
      playItem(0);
    });
  }, [digestDate, items.length, speak]);

  // Play a specific item - defined with useCallback
  const playItem = useCallback((index: number) => {
    if (index >= items.length) {
      // Finished all items
      setIsPlaying(false);
      setCurrentItemIndex(0);
      setCurrentTime(0);
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current.currentTime = 0;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    setCurrentItemIndex(index);
    const text = getItemText(index);
    speak(text, () => {
      playItem(index + 1);
    });
  }, [items.length, getItemText, speak]);

  // Start/stop playback
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      // Pause
      isPausedRef.current = true;
      window.speechSynthesis.cancel();
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setIsPlaying(false);
    } else {
      // Play
      isPausedRef.current = false;
      setIsPlaying(true);
      setIsLoading(true);

      // Start ambient music if available
      if (ambientAudioRef.current && ambientVolume > 0 && ambientAvailable) {
        ambientAudioRef.current.play().catch(() => {
          setAmbientAvailable(false);
        });
      }

      // Start progress tracking
      startTimeRef.current = Date.now() - (currentTime * 1000);
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setCurrentTime(Math.min(elapsed, duration));
      }, 1000);

      // Load voices if needed (Chrome requires this)
      const startSpeaking = () => {
        setIsLoading(false);
        if (currentItemIndex === 0 && currentTime === 0) {
          playIntro();
        } else {
          playItem(currentItemIndex);
        }
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = startSpeaking;
      } else {
        startSpeaking();
      }
    }
  }, [isPlaying, currentTime, duration, currentItemIndex, ambientVolume, ambientAvailable, playIntro, playItem]);

  // Skip to previous item
  const skipPrevious = useCallback(() => {
    const newIndex = Math.max(0, currentItemIndex - 1);
    window.speechSynthesis.cancel();
    setCurrentItemIndex(newIndex);
    if (isPlaying) {
      isPausedRef.current = false;
      playItem(newIndex);
    }
  }, [currentItemIndex, isPlaying, playItem]);

  // Skip to next item
  const skipNext = useCallback(() => {
    const newIndex = Math.min(items.length - 1, currentItemIndex + 1);
    window.speechSynthesis.cancel();
    setCurrentItemIndex(newIndex);
    if (isPlaying) {
      isPausedRef.current = false;
      playItem(newIndex);
    }
  }, [currentItemIndex, items.length, isPlaying, playItem]);

  // Format time as m:ss
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-brand-900 rounded-2xl p-4 shadow-lg mb-6">
      <div className="flex items-center gap-3">
        {/* Playback controls */}
        <button
          onClick={skipPrevious}
          disabled={currentItemIndex === 0 && !isPlaying}
          className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center
                    text-brand-300 hover:text-white hover:bg-brand-700
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous item"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlayback}
          disabled={isLoading}
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center
                    text-brand-900 hover:bg-brand-100 transition-colors shadow-md"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-brand-900 border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        <button
          onClick={skipNext}
          disabled={currentItemIndex === items.length - 1 && !isPlaying}
          className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center
                    text-brand-300 hover:text-white hover:bg-brand-700
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next item"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Time and progress */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-sm text-brand-300 font-mono w-10 text-right flex-shrink-0">
            {formatTime(currentTime)}
          </span>

          <div className="flex-1 h-1.5 bg-brand-800 rounded-full overflow-hidden min-w-0">
            <div
              className="h-full bg-brand-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

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
                  Add a lofi track to /public/audio/lofi-ambient.mp3 to enable
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current item indicator */}
      <div className="mt-3 flex items-center gap-2">
        <Volume2 className="w-3.5 h-3.5 text-brand-400" />
        <span className="text-xs text-brand-300">
          {isPlaying
            ? `Playing item ${currentItemIndex + 1} of ${items.length}`
            : currentTime > 0
              ? `Paused at item ${currentItemIndex + 1} of ${items.length}`
              : `${items.length} items ready to play`
          }
        </span>
      </div>
    </div>
  );
}
