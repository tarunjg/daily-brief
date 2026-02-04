import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { uploadAudioBuffer } from '@/lib/services/storage';
import { db } from '@/lib/db';
import { voiceNotes, notes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const digestItemId = formData.get('digestItemId') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || 'audio/webm';

    // Find the note for this item
    const [note] = await db.select()
      .from(notes)
      .where(and(
        eq(notes.userId, session.user.id),
        eq(notes.digestItemId, digestItemId),
      ))
      .limit(1);

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Upload to Supabase Storage
    const filePath = await uploadAudioBuffer(
      session.user.id,
      note.id,
      buffer,
      mimeType,
    );

    // Update voice note record
    const existingVoice = await db.select()
      .from(voiceNotes)
      .where(eq(voiceNotes.noteId, note.id))
      .limit(1);

    if (existingVoice.length > 0) {
      await db.update(voiceNotes).set({
        audioUrl: filePath,
        audioFormat: mimeType.split('/')[1] || 'webm',
        updatedAt: new Date(),
      }).where(eq(voiceNotes.noteId, note.id));
    } else {
      await db.insert(voiceNotes).values({
        noteId: note.id,
        audioUrl: filePath,
        audioFormat: mimeType.split('/')[1] || 'webm',
      });
    }

    return NextResponse.json({ success: true, filePath });
  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
