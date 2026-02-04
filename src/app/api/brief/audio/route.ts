import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { digests, digestItems } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { generateBriefAudio, isElevenLabsConfigured } from '@/lib/services/tts';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if ElevenLabs is configured
  if (!isElevenLabsConfigured()) {
    return NextResponse.json(
      { error: 'Text-to-speech is not configured' },
      { status: 503 }
    );
  }

  try {
    // Get the latest digest
    const [latestDigest] = await db.select()
      .from(digests)
      .where(and(eq(digests.userId, session.user.id), eq(digests.status, 'ready')))
      .orderBy(desc(digests.digestDate))
      .limit(1);

    if (!latestDigest) {
      return NextResponse.json({ error: 'No brief found' }, { status: 404 });
    }

    // Get digest items
    const items = await db.select()
      .from(digestItems)
      .where(eq(digestItems.digestId, latestDigest.id))
      .orderBy(digestItems.position);

    if (items.length === 0) {
      return NextResponse.json({ error: 'Brief has no items' }, { status: 404 });
    }

    // Generate audio
    const audioBuffer = await generateBriefAudio(items);

    // Return audio as response (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('TTS generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
