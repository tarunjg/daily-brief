import type { TranscriptionStatus } from '@/types';
import { getRequiredEnv } from '@/lib/env';

interface TranscriptionResult {
  transcript: string;
  confidence: number;
  status: TranscriptionStatus;
  durationSeconds: number;
}

/**
 * Transcribe audio using Deepgram Nova-2 API.
 * Supports WebM, MP4, WAV, and other common formats.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm',
): Promise<TranscriptionResult> {
  const apiKey = getRequiredEnv('DEEPGRAM_API_KEY');

  try {
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=false&language=en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': mimeType,
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Transcription] Deepgram error:', errorText);
      throw new Error(`Deepgram API error: ${response.status}`);
    }

    const data = await response.json();
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    if (!alternative) {
      throw new Error('No transcription result returned');
    }

    return {
      transcript: alternative.transcript || '',
      confidence: alternative.confidence || 0,
      status: 'completed',
      durationSeconds: Math.ceil(data.metadata?.duration || 0),
    };
  } catch (error) {
    console.error('[Transcription] Failed:', error);
    return {
      transcript: '',
      confidence: 0,
      status: 'failed',
      durationSeconds: 0,
    };
  }
}

/**
 * Transcribe audio from a URL (e.g., a GCS signed URL).
 */
export async function transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
  const apiKey = getRequiredEnv('DEEPGRAM_API_KEY');

  try {
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&language=en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: audioUrl }),
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.status}`);
    }

    const data = await response.json();
    const alternative = data.results?.channels?.[0]?.alternatives?.[0];

    return {
      transcript: alternative?.transcript || '',
      confidence: alternative?.confidence || 0,
      status: 'completed',
      durationSeconds: Math.ceil(data.metadata?.duration || 0),
    };
  } catch (error) {
    console.error('[Transcription] URL transcription failed:', error);
    return {
      transcript: '',
      confidence: 0,
      status: 'failed',
      durationSeconds: 0,
    };
  }
}
