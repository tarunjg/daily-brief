import { createClient, SupabaseClient } from '@supabase/supabase-js';

const VOICE_BUCKET = 'voice-recordings';

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, key);
}

/**
 * Upload audio buffer directly from the server to Supabase Storage.
 */
export async function uploadAudioBuffer(
  userId: string,
  noteId: string,
  buffer: Buffer,
  contentType: string = 'audio/webm',
): Promise<string> {
  const supabase = getSupabaseClient();
  const ext = contentType.includes('mp4') ? 'mp4' : 'webm';
  const filePath = `${userId}/${noteId}.${ext}`;

  const { error } = await supabase.storage
    .from(VOICE_BUCKET)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error('[Storage] Upload error:', error);
    throw new Error('Failed to upload audio');
  }

  return filePath;
}

/**
 * Get the public URL for an audio file.
 */
export function getPublicUrl(filePath: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from(VOICE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Delete an audio file from storage.
 */
export async function deleteAudioFile(filePath: string): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    await supabase.storage
      .from(VOICE_BUCKET)
      .remove([filePath]);
  } catch (error) {
    console.error(`[Storage] Failed to delete ${filePath}:`, error);
  }
}
