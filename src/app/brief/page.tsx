import { requireOnboarding } from '@/lib/auth';
import { db } from '@/lib/db';
import { digests, digestItems, notes, contentFeedback, favoriteArticles, users } from '@/lib/db/schema';
import { eq, desc, and, asc, lt, gt } from 'drizzle-orm';
import { AppHeader } from '@/components/layout/app-header';
import { Footer } from '@/components/layout/footer';
import { BriefView } from '@/components/brief/brief-view';
import { formatDate } from '@/lib/utils';
import { BookOpen, RefreshCw, ChevronLeft, ChevronRight, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Props {
  searchParams: { date?: string };
}

export default async function BriefPage({ searchParams }: Props) {
  const session = await requireOnboarding();
  const userId = session.user.id;
  const requestedDate = searchParams.date;

  // Get user's Google Doc ID
  const [user] = await db.select({ googleDocId: users.googleDocId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Get digest for requested date, or latest if no date specified
  let currentDigest;
  if (requestedDate) {
    [currentDigest] = await db.select()
      .from(digests)
      .where(and(
        eq(digests.userId, userId),
        eq(digests.status, 'ready'),
        eq(digests.digestDate, requestedDate)
      ))
      .limit(1);
  }

  if (!currentDigest) {
    [currentDigest] = await db.select()
      .from(digests)
      .where(and(eq(digests.userId, userId), eq(digests.status, 'ready')))
      .orderBy(desc(digests.digestDate))
      .limit(1);
  }

  // Get adjacent digests for navigation
  let prevDigest = null;
  let nextDigest = null;

  if (currentDigest) {
    [prevDigest] = await db.select({ digestDate: digests.digestDate })
      .from(digests)
      .where(and(
        eq(digests.userId, userId),
        eq(digests.status, 'ready'),
        lt(digests.digestDate, currentDigest.digestDate)
      ))
      .orderBy(desc(digests.digestDate))
      .limit(1);

    [nextDigest] = await db.select({ digestDate: digests.digestDate })
      .from(digests)
      .where(and(
        eq(digests.userId, userId),
        eq(digests.status, 'ready'),
        gt(digests.digestDate, currentDigest.digestDate)
      ))
      .orderBy(asc(digests.digestDate))
      .limit(1);
  }

  let items: any[] = [];
  let userNotes: any[] = [];
  let userFeedback: any[] = [];
  let userFavorites: any[] = [];

  if (currentDigest) {
    // Get digest items
    items = await db.select()
      .from(digestItems)
      .where(eq(digestItems.digestId, currentDigest.id))
      .orderBy(digestItems.position);

    // Get user notes, feedback, and favorites
    const itemIds = items.map(i => i.id);
    if (itemIds.length > 0) {
      userNotes = await db.select()
        .from(notes)
        .where(eq(notes.userId, userId));

      userFeedback = await db.select()
        .from(contentFeedback)
        .where(eq(contentFeedback.userId, userId));

      userFavorites = await db.select()
        .from(favoriteArticles)
        .where(eq(favoriteArticles.userId, userId));
    }
  }

  const notesByItemId = new Map(userNotes.map(n => [n.digestItemId, n]));
  const feedbackByItemId = new Map(userFeedback.map(f => [f.digestItemId, f.feedbackType]));
  const favoritesSet = new Set(userFavorites.map(f => f.digestItemId));

  const googleDocUrl = user?.googleDocId
    ? `https://docs.google.com/document/d/${user.googleDocId}/edit`
    : null;

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        {currentDigest ? (
          <>
            {/* Brief header with date navigation */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h1 className="font-display text-display text-surface-900">
                  Your Daily Brief
                </h1>

                {/* Date navigation */}
                <div className="flex items-center gap-1">
                  {prevDigest ? (
                    <Link
                      href={`/brief?date=${prevDigest.digestDate}`}
                      className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                      title="Previous day"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Link>
                  ) : (
                    <div className="p-2 text-surface-200">
                      <ChevronLeft className="w-5 h-5" />
                    </div>
                  )}

                  {nextDigest ? (
                    <Link
                      href={`/brief?date=${nextDigest.digestDate}`}
                      className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                      title="Next day"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  ) : (
                    <div className="p-2 text-surface-200">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-surface-500 text-sm">
                {formatDate(currentDigest.digestDate)} · {items.length} items · {currentDigest.totalWordCount} words
              </p>
            </div>

            {/* Items */}
            <BriefView
              items={items.map(item => ({
                id: item.id,
                position: item.position,
                title: item.title,
                summary: item.summary,
                whyItMatters: item.whyItMatters,
                relevanceScore: item.relevanceScore,
                topics: item.topics || [],
                sourceLinks: (item.sourceLinks as any[]) || [],
                hasReflection: notesByItemId.has(item.id),
                reflectionText: notesByItemId.get(item.id)?.textContent || null,
                feedback: feedbackByItemId.get(item.id) || null,
                isFavorite: favoritesSet.has(item.id),
              }))}
              digestId={currentDigest.id}
            />

            {/* Bottom action buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <form action="/api/export" method="POST">
                <button type="submit" className="btn-secondary inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Export Reflections
                </button>
              </form>

              {googleDocUrl && (
                <a
                  href={googleDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Learnings
                </a>
              )}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-8 h-8 text-[#1E3A5F]" />
            </div>
            <h2 className="font-display text-display-sm text-surface-900 mb-2">
              Your first brief is being prepared
            </h2>
            <p className="text-surface-500 text-sm max-w-sm mx-auto mb-6">
              We're gathering and personalizing today's news for you.
              This usually takes about a minute.
            </p>
            <Link href="/api/generate-brief" className="btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Generate now
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
