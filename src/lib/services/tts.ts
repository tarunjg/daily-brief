import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { getOptionalEnv, getRequiredEnv } from '@/lib/env';

let client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!client) {
    const apiKey = getRequiredEnv('ELEVENLABS_API_KEY');
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
}

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
}

const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam - a natural male voice
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

export async function generateSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const elevenLabs = getClient();

  const voiceId = options.voiceId || getOptionalEnv('ELEVENLABS_VOICE_ID') || DEFAULT_VOICE_ID;
  const modelId = options.modelId || DEFAULT_MODEL_ID;

  const audioStream = await elevenLabs.textToSpeech.convert(voiceId, {
    text,
    modelId,
    outputFormat: 'mp3_44100_128',
  });

  // Collect chunks from the ReadableStream
  const reader = audioStream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function generateBriefAudio(
  items: { title: string; summary: string; whyItMatters: string }[]
): Promise<Buffer> {
  // Create a script from the brief items
  const script = items.map((item, index) => {
    const intro = index === 0 ? "Here's your daily brief. " : '';
    return `${intro}${item.title}. ${item.summary} Why it matters: ${item.whyItMatters}`;
  }).join(' ... ');

  return generateSpeech(script);
}

export function isElevenLabsConfigured(): boolean {
  return !!getOptionalEnv('ELEVENLABS_API_KEY');
}
