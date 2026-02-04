import type { TranscriptionStatus } from '@/types';
import OpenAI, { toFile } from 'openai';

interface TranscriptionResult {
  transcript: string;
  confidence: number;
  status: TranscriptionStatus;
  durationSeconds: number;
}

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Transcribe audio using OpenAI Whisper API.
 * Supports WebM, MP4, WAV, MP3, and other common formats.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm',
): Promise<TranscriptionResult> {
  const openai = getOpenAIClient();

  try {
    // Determine file extension from mime type
    const ext = mimeType.includes('mp4') ? 'mp4'
      : mimeType.includes('wav') ? 'wav'
      : mimeType.includes('mp3') ? 'mp3'
      : 'webm';

    // Convert buffer to file using OpenAI's helper
    const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: file,
      language: 'en',
    });

    return {
      transcript: response.text || '',
      confidence: 0.95, // Whisper doesn't return confidence, assume high
      status: 'completed',
      durationSeconds: 0, // Whisper doesn't return duration in basic response
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
 * Transcribe audio from a URL by downloading and processing it.
 */
export async function transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
  try {
    // Download the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'audio/webm';

    // Use the buffer transcription
    return transcribeAudio(buffer, contentType);
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
