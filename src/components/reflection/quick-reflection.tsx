'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  userName: string;
}

export function QuickReflection({ userName }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio(blob);
      };

      recorder.start(250);
      setIsRecording(true);
      toast.info('Recording... Click mic again to stop');
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
  }, []);

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Transcribe audio
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Transcription failed');

      const data = await res.json();
      const transcript = data.transcript || '';

      // Append to existing text with proper spacing
      setText(prev => {
        if (prev.trim()) {
          return prev.trim() + ' ' + transcript;
        }
        return transcript;
      });

      toast.success('Transcription complete');
    } catch (error) {
      toast.error('Transcription failed. Please try again or type your reflection.');
      console.error(error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Save reflection - for now just clears the text
  // General notes get saved but not tied to a specific brief item
  const handleSave = async () => {
    if (!text.trim()) {
      toast.error('Please write or record something first.');
      return;
    }

    setSaving(true);
    try {
      // For now, just show success - in the future, save to a general notes table
      await new Promise(resolve => setTimeout(resolve, 300));
      toast.success('Reflection noted! Use the Reflect button on brief items to save permanently.');
      setText('');
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const firstName = userName.split(' ')[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 mb-8">
      {/* Welcome header */}
      <h2 className="font-display text-2xl font-semibold text-surface-900 mb-1">
        Welcome back, {firstName}
      </h2>
      <p className="text-surface-500 text-sm mb-5">
        What's on your mind today?
      </p>

      {/* Input area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Jot down a thought, idea, or something you learned today..."
          rows={3}
          className="input-field resize-none pr-12"
          disabled={isTranscribing}
        />

        {/* Mic button */}
        <button
          onClick={toggleRecording}
          disabled={isTranscribing}
          className={`absolute left-3 bottom-3 p-2 rounded-lg transition-all ${
            isRecording
              ? 'bg-accent-red/10 text-accent-red animate-pulse'
              : isTranscribing
                ? 'bg-surface-100 text-surface-400'
                : 'text-surface-400 hover:text-brand-600 hover:bg-brand-50'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isTranscribing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <p className="text-xs text-accent-red mt-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
          Recording... Click the mic to stop
        </p>
      )}

      {isTranscribing && (
        <p className="text-xs text-surface-500 mt-2">
          Transcribing your voice...
        </p>
      )}

      {/* Save button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving || !text.trim() || isTranscribing}
          className="btn-primary"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Reflection'
          )}
        </button>
      </div>
    </div>
  );
}
