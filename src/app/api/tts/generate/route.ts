import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generateSpeech, buildBriefText, getDefaultVoiceId } from '@/lib/services/elevenlabs';
import { getOptionalEnv } from '@/lib/env';

export async function POST(req: NextRequest) {
  // Check if ElevenLabs is configured
  if (!getOptionalEnv('ELEVENLABS_API_KEY')) {
    return NextResponse.json(
      { error: 'ElevenLabs not configured', fallbackToWebSpeech: true },
      { status: 501 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { items, digestDate, voiceId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Build the full text
    const text = buildBriefText(items, digestDate || 'today');

    // Generate speech
    const audioBuffer = await generateSpeech({
      text,
      voiceId: voiceId || getDefaultVoiceId(),
    });

    // Return the audio as MP3
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('TTS generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech', fallbackToWebSpeech: true },
      { status: 500 }
    );
  }
}
