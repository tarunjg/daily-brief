import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { notes, voiceNotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { digestItemId, textContent, noteType, originalTranscript, editedTranscript } = body;

    if (!digestItemId || !textContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing note on this item
    const existing = await db.select()
      .from(notes)
      .where(and(
        eq(notes.userId, session.user.id),
        eq(notes.digestItemId, digestItemId),
      ))
      .limit(1);

    let noteId: string;

    if (existing.length > 0) {
      // Update existing note
      noteId = existing[0].id;
      await db.update(notes).set({
        textContent,
        noteType: noteType || 'text',
        updatedAt: new Date(),
        exportedToDoc: false, // Reset export status on edit
      }).where(eq(notes.id, noteId));
    } else {
      // Create new note
      const [newNote] = await db.insert(notes).values({
        userId: session.user.id,
        digestItemId,
        noteType: noteType || 'text',
        textContent,
      }).returning({ id: notes.id });
      noteId = newNote.id;
    }

    // If voice note, save transcript data
    if (noteType === 'voice' && originalTranscript) {
      const existingVoice = await db.select()
        .from(voiceNotes)
        .where(eq(voiceNotes.noteId, noteId))
        .limit(1);

      if (existingVoice.length > 0) {
        await db.update(voiceNotes).set({
          originalTranscript,
          editedTranscript: editedTranscript || null,
          transcriptionStatus: 'completed',
          updatedAt: new Date(),
        }).where(eq(voiceNotes.noteId, noteId));
      } else {
        await db.insert(voiceNotes).values({
          noteId,
          originalTranscript,
          editedTranscript: editedTranscript || null,
          transcriptionStatus: 'completed',
        });
      }
    }

    return NextResponse.json({ success: true, noteId });
  } catch (error) {
    console.error('Note save error:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}
