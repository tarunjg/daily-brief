import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { favoriteArticles, digestItems, digests } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const favorites = await db.select({
      id: favoriteArticles.id,
      digestItemId: favoriteArticles.digestItemId,
      title: digestItems.title,
      summary: digestItems.summary,
      topics: digestItems.topics,
      sourceLinks: digestItems.sourceLinks,
      createdAt: favoriteArticles.createdAt,
    })
      .from(favoriteArticles)
      .innerJoin(digestItems, eq(favoriteArticles.digestItemId, digestItems.id))
      .where(eq(favoriteArticles.userId, session.user.id))
      .orderBy(desc(favoriteArticles.createdAt))
      .limit(50);

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Favorites fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { digestItemId } = await req.json();

    if (!digestItemId) {
      return NextResponse.json({ error: 'Missing digestItemId' }, { status: 400 });
    }

    // Check if already favorited
    const existing = await db.select()
      .from(favoriteArticles)
      .where(and(
        eq(favoriteArticles.userId, session.user.id),
        eq(favoriteArticles.digestItemId, digestItemId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ success: true, alreadyFavorited: true });
    }

    await db.insert(favoriteArticles).values({
      userId: session.user.id,
      digestItemId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Favorite error:', error);
    return NextResponse.json({ error: 'Failed to save favorite' }, { status: 500 });
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

    await db.delete(favoriteArticles)
      .where(and(
        eq(favoriteArticles.userId, session.user.id),
        eq(favoriteArticles.digestItemId, digestItemId)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unfavorite error:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
