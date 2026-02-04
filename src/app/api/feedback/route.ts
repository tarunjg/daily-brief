import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { contentFeedback } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { digestItemId, feedbackType } = await req.json();

    if (!digestItemId || !['more', 'less'].includes(feedbackType)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Check if feedback already exists and update or insert
    const existing = await db.select()
      .from(contentFeedback)
      .where(and(
        eq(contentFeedback.userId, session.user.id),
        eq(contentFeedback.digestItemId, digestItemId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing feedback
      await db.update(contentFeedback)
        .set({ feedbackType })
        .where(eq(contentFeedback.id, existing[0].id));
    } else {
      // Insert new feedback
      await db.insert(contentFeedback).values({
        userId: session.user.id,
        digestItemId,
        feedbackType,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const digestItemId = searchParams.get('digestItemId');

    if (!digestItemId) {
      return NextResponse.json({ error: 'Missing digestItemId' }, { status: 400 });
    }

    await db.delete(contentFeedback)
      .where(and(
        eq(contentFeedback.userId, session.user.id),
        eq(contentFeedback.digestItemId, digestItemId)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback delete error:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
