import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { listVoices, getDefaultVoiceId } from '@/lib/services/elevenlabs';
import { getOptionalEnv } from '@/lib/env';

export async function GET(req: NextRequest) {
  // Check if ElevenLabs is configured
  if (!getOptionalEnv('ELEVENLABS_API_KEY')) {
    return NextResponse.json(
      { error: 'ElevenLabs not configured', voices: [] },
      { status: 501 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const voices = await listVoices();
    const defaultVoiceId = getDefaultVoiceId();

    return NextResponse.json({
      voices: voices.map(v => ({
        id: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels,
        isDefault: v.voice_id === defaultVoiceId,
      })),
      defaultVoiceId,
    });
  } catch (error) {
    console.error('Failed to list voices:', error);
    return NextResponse.json(
      { error: 'Failed to list voices', voices: [] },
      { status: 500 }
    );
  }
}
