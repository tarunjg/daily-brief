import { Storage } from '@google-cloud/storage';

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) {
    storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });
  }
  return storage;
}

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'daily-brief-audio';

/**
 * Generate a signed upload URL for direct client-side upload.
 */
export async function getSignedUploadUrl(
  userId: string,
  noteId: string,
  contentType: string = 'audio/webm',
): Promise<{ uploadUrl: string; filePath: string }> {
  const gcs = getStorage();
  const filePath = `audio/${userId}/${noteId}.webm`;
  const bucket = gcs.bucket(BUCKET_NAME);
  const file = bucket.file(filePath);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  });

  return { uploadUrl: url, filePath };
}

/**
 * Generate a signed download URL for playback.
 */
export async function getSignedPlaybackUrl(
  filePath: string,
  expiresInMinutes: number = 60,
): Promise<string> {
  const gcs = getStorage();
  const bucket = gcs.bucket(BUCKET_NAME);
  const file = bucket.file(filePath);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return url;
}

/**
 * Upload audio buffer directly from the server.
 */
export async function uploadAudioBuffer(
  userId: string,
  noteId: string,
  buffer: Buffer,
  contentType: string = 'audio/webm',
): Promise<string> {
  const gcs = getStorage();
  const filePath = `audio/${userId}/${noteId}.webm`;
  const bucket = gcs.bucket(BUCKET_NAME);
  const file = bucket.file(filePath);

  await file.save(buffer, {
    contentType,
    metadata: {
      userId,
      noteId,
      uploadedAt: new Date().toISOString(),
    },
  });

  return filePath;
}

/**
 * Delete an audio file.
 */
export async function deleteAudioFile(filePath: string): Promise<void> {
  const gcs = getStorage();
  const bucket = gcs.bucket(BUCKET_NAME);
  const file = bucket.file(filePath);

  try {
    await file.delete();
  } catch (error) {
    console.error(`[GCS] Failed to delete ${filePath}:`, error);
  }
}
