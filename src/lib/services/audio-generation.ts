import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { digests, digestItems } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');
  return new OpenAI({ apiKey });
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

function buildAudioScript(
  digest: { opening: string | null; closing: string | null; digestDate: string },
  items: { title: string; summary: string; whyItMatters: string }[]
): string {
  const parts: string[] = [];

  if (digest.opening) {
    parts.push(digest.opening);
    parts.push('');
  } else {
    parts.push(`Good morning. Here's your daily brief for today.`);
    parts.push('');
  }

  items.forEach((item, index) => {
    parts.push(item.title);
    parts.push(item.summary);
    if (item.whyItMatters) {
      parts.push(item.whyItMatters);
    }
    if (index < items.length - 1) {
      parts.push('');
    }
  });

  parts.push('');
  if (digest.closing) {
    parts.push(digest.closing);
  } else {
    parts.push(`That's your brief for today. Have a great one.`);
  }

  return parts.join('\n\n');
}

/**
 * Generate audio for a digest and store it in Supabase.
 * Called during brief generation to pre-generate audio.
 */
export async function generateAudioForDigest(digestId: string): Promise<string | null> {
  // Get digest
  const [digest] = await db.select()
    .from(digests)
    .where(eq(digests.id, digestId))
    .limit(1);

  if (!digest) {
    throw new Error('Digest not found');
  }

  // Skip if already has audio
  if (digest.audioUrl) {
    return digest.audioUrl;
  }

  // Get items
  const items = await db.select({
    title: digestItems.title,
    summary: digestItems.summary,
    whyItMatters: digestItems.whyItMatters,
  })
    .from(digestItems)
    .where(eq(digestItems.digestId, digestId))
    .orderBy(asc(digestItems.position));

  if (items.length === 0) {
    throw new Error('No items to convert');
  }

  // Build script
  const script = buildAudioScript(digest, items);

  // Generate audio
  const openai = getOpenAIClient();
  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'nova',
    input: script,
    speed: 1.0,
  });

  const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());

  // Upload to Supabase
  const supabase = getSupabaseClient();
  const fileName = `brief-${digestId}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('audio')
    .getPublicUrl(fileName);

  const audioUrl = urlData.publicUrl;

  // Update digest
  await db.update(digests).set({
    audioUrl,
    updatedAt: new Date(),
  }).where(eq(digests.id, digestId));

  console.log(`[Audio] Generated audio for digest ${digestId}`);
  return audioUrl;
}
