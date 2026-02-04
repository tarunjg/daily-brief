'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Mic, Square, Loader2, Check, Type, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  digestId?: string;
}

type Mode = 'type' | 'record';

export function VoiceNoteModal({ onClose, onSaved, digestId }: Props) {
  const [mode, setMode] = useState<Mode>('record');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [hasTranscript, setHasTranscript] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (error) {
      toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      console.error('Recording error:', error);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Transcribe audio
  const transcribeAudio = useCallback(async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      if (digestId) {
        formData.append('digestId', digestId);
      }

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Transcription failed');

      const data = await res.json();
      const transcript = data.transcript || '';
      setOriginalTranscript(transcript);
      setText(transcript);
      setHasTranscript(true);
      toast.success('Transcription complete');
    } catch (error) {
      toast.error('Transcription failed. You can type your note instead.');
      console.error(error);
    } finally {
      setIsTranscribing(false);
    }
  }, [audioBlob, digestId]);

  // Auto-transcribe when recording stops
  useEffect(() => {
    if (audioBlob && !hasTranscript) {
      transcribeAudio();
    }
  }, [audioBlob, hasTranscript, transcribeAudio]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!text.trim()) {
      toast.error('Nothing to copy yet.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text.trim());
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
      console.error(error);
    }
  };

  // Reset and record again
  const handleRecordAgain = () => {
    setAudioBlob(null);
    setHasTranscript(false);
    setOriginalTranscript('');
    setText('');
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl
                    shadow-modal animate-slide-up max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-surface-100">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-display text-base font-semibold text-surface-900">
              Quick Voice Note
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Capture a thought, idea, or reflection
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 -mr-1.5 -mt-0.5 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-surface-100">
          <button
            onClick={() => setMode('record')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium
              transition-colors border-b-2 ${
              mode === 'record'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-surface-400 hover:text-surface-600'
            }`}
          >
            <Mic className="w-4 h-4" />
            Record
          </button>
          <button
            onClick={() => setMode('type')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium
              transition-colors border-b-2 ${
              mode === 'type'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-surface-400 hover:text-surface-600'
            }`}
          >
            <Type className="w-4 h-4" />
            Type
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-auto">
          {mode === 'type' ? (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What's on your mind? Capture your thoughts here..."
              rows={6}
              className="input-field resize-none h-40"
              autoFocus
            />
          ) : (
            <div className="space-y-4">
              {/* Recording controls */}
              {!hasTranscript && (
                <div className="flex flex-col items-center py-6">
                  {isRecording ? (
                    <>
                      {/* Recording indicator */}
                      <div className="flex items-center gap-1.5 mb-4">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                      <p className="text-2xl font-mono text-surface-800 mb-1">
                        {formatTime(recordingTime)}
                      </p>
                      <p className="text-xs text-surface-400 mb-5">Recording...</p>
                      <button
                        onClick={stopRecording}
                        className="w-14 h-14 rounded-full bg-accent-red flex items-center justify-center
                                 hover:bg-red-700 transition-colors shadow-lg"
                      >
                        <Square className="w-5 h-5 text-white fill-white" />
                      </button>
                    </>
                  ) : audioBlob ? (
                    <>
                      <div className="flex items-center gap-2 text-surface-500 mb-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Transcribing your recording...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-surface-500 mb-5 text-center">
                        Tap the microphone to record your thoughts.
                      </p>
                      <button
                        onClick={startRecording}
                        className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center
                                 hover:bg-brand-700 transition-colors shadow-lg active:scale-95"
                      >
                        <Mic className="w-7 h-7 text-white" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Transcript area (editable) */}
              {hasTranscript && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-surface-500">
                      Auto-transcribed — feel free to edit
                    </span>
                    {audioBlob && (
                      <span className="text-xs text-surface-400">
                        {formatTime(recordingTime)} recorded
                      </span>
                    )}
                  </div>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={6}
                    className="input-field resize-none h-40"
                  />
                </div>
              )}

              {isTranscribing && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                  <span className="text-sm text-surface-500">Transcribing...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-3 border-t border-surface-100 flex justify-between">
          <div>
            {hasTranscript && (
              <button
                onClick={handleRecordAgain}
                className="btn-ghost text-surface-500"
              >
                <RotateCcw className="w-4 h-4" />
                Record again
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
            <button
              onClick={handleCopy}
              disabled={!text.trim()}
              className="btn-primary"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Text
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
