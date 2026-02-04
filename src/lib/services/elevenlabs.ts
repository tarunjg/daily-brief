import { getRequiredEnv, getOptionalEnv } from '@/lib/env';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

/**
 * Get the ElevenLabs API key
 */
function getApiKey(): string {
  return getRequiredEnv('ELEVENLABS_API_KEY');
}

/**
 * Get the default voice ID (can be overridden via env)
 */
export function getDefaultVoiceId(): string {
  // Use custom voice ID from env, or fall back to a default
  return getOptionalEnv('ELEVENLABS_VOICE_ID') || 'EXAVITQu4vr4xnSDxMaL'; // Sarah (default)
}

/**
 * Get the model ID for TTS
 */
function getModelId(): string {
  // eleven_multilingual_v2 is the highest quality
  // eleven_turbo_v2_5 is faster but slightly lower quality
  return getOptionalEnv('ELEVENLABS_MODEL_ID') || 'eleven_multilingual_v2';
}

/**
 * List all available voices in your ElevenLabs account
 */
export async function listVoices(): Promise<Voice[]> {
  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      'xi-api-key': getApiKey(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list voices: ${response.statusText}`);
  }

  const data = await response.json();
  return data.voices || [];
}

/**
 * Generate speech from text using ElevenLabs
 * Returns an audio buffer (MP3)
 */
export async function generateSpeech(options: TTSOptions): Promise<Buffer> {
  const {
    text,
    voiceId = getDefaultVoiceId(),
    modelId = getModelId(),
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.5,
    useSpeakerBoost = true,
  } = options;

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': getApiKey(),
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate speech with streaming (for longer content)
 * Returns a ReadableStream
 */
export async function generateSpeechStream(options: TTSOptions): Promise<ReadableStream<Uint8Array>> {
  const {
    text,
    voiceId = getDefaultVoiceId(),
    modelId = getModelId(),
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.5,
    useSpeakerBoost = true,
  } = options;

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': getApiKey(),
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      }),
    }
  );

  if (!response.ok || !response.body) {
    const error = await response.text();
    throw new Error(`ElevenLabs streaming TTS failed: ${response.status} - ${error}`);
  }

  return response.body;
}

/**
 * Build the full brief text for TTS
 */
export function buildBriefText(
  items: { title: string; summary: string; whyItMatters: string }[],
  digestDate: string
): string {
  const intro = `Your Daily Brief for ${digestDate}. You have ${items.length} items today.\n\n`;

  const itemTexts = items.map((item, index) => {
    return `Item ${index + 1}: ${item.title}.\n${item.summary}\nWhy it matters for you: ${item.whyItMatters}`;
  }).join('\n\n');

  return intro + itemTexts;
}
