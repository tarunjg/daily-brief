import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { digests, digestItems } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Convert the brief content into a natural spoken script
 */
function buildAudioScript(
  digest: { opening: string | null; closing: string | null; digestDate: string },
  items: { title: string; summary: string; whyItMatters: string }[]
): string {
  const parts: string[] = [];

  // Opening
  if (digest.opening) {
    parts.push(digest.opening);
    parts.push(''); // pause
  } else {
    parts.push(`Good morning. Here's your daily brief for today.`);
    parts.push('');
  }

  // Items
  items.forEach((item, index) => {
    // Title
    parts.push(item.title);

    // Summary with natural flow
    parts.push(item.summary);

    // Why it matters (make it conversational)
    if (item.whyItMatters) {
      parts.push(item.whyItMatters);
    }

    // Add a pause between items (except for last)
    if (index < items.length - 1) {
      parts.push('');
    }
  });

  // Closing
  parts.push('');
  if (digest.closing) {
    parts.push(digest.closing);
  } else {
    parts.push(`That's your brief for today. Have a great one.`);
  }

  return parts.join('\n\n');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { digestId } = await req.json();

    if (!digestId) {
      return NextResponse.json({ error: 'Missing digestId' }, { status: 400 });
    }

    // Get digest
    const [digest] = await db.select()
      .from(digests)
      .where(eq(digests.id, digestId))
      .limit(1);

    if (!digest || digest.userId !== session.user.id) {
      return NextResponse.json({ error: 'Digest not found' }, { status: 404 });
    }

    // If audio already exists, return it
    if (digest.audioUrl) {
      return NextResponse.json({ audioUrl: digest.audioUrl });
    }

    // Get digest items
    const items = await db.select({
      title: digestItems.title,
      summary: digestItems.summary,
      whyItMatters: digestItems.whyItMatters,
    })
      .from(digestItems)
      .where(eq(digestItems.digestId, digestId))
      .orderBy(asc(digestItems.position));

    if (items.length === 0) {
      return NextResponse.json({ error: 'No content to convert' }, { status: 400 });
    }

    // Build the script
    const script = buildAudioScript(digest, items);

    // Generate audio using OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: 'onyx', // warm, conversational male voice
      input: script,
      speed: 0.95, // slightly slower for clarity
    });

    // Get the audio buffer
    const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());

    // Upload to Supabase Storage
    const fileName = `brief-${digestId}.mp3`;
    const { data, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error('Failed to upload audio');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;

    // Update digest with audio URL
    await db.update(digests).set({
      audioUrl,
      updatedAt: new Date(),
    }).where(eq(digests.id, digestId));

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
