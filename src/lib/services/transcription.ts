import OpenAI from 'openai';
import type { TranscriptionStatus } from '@/types';
import { getRequiredEnv } from '@/lib/env';

const openai = new OpenAI({ apiKey: getRequiredEnv('OPENAI_API_KEY') });

interface TranscriptionResult {
  transcript: string;
  confidence: number;
  status: TranscriptionStatus;
  durationSeconds: number;
}

/**
 * Transcribe audio using OpenAI.
 * Supports WebM, MP4, WAV, and other common formats.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm',
): Promise<TranscriptionResult> {
  try {
    const audioFile = new File([new Uint8Array(audioBuffer)], 'reflection.webm', { type: mimeType });
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-mini-transcribe',
    });

    return {
      transcript: response.text || '',
      confidence: 0,
      status: 'completed',
      durationSeconds: 0,
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
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }
    const mimeType = response.headers.get('content-type') || 'audio/webm';
    const buffer = Buffer.from(await response.arrayBuffer());
    return await transcribeAudio(buffer, mimeType);
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
