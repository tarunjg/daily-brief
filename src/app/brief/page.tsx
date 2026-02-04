import { requireOnboarding } from '@/lib/auth';
import { db } from '@/lib/db';
import { digests, digestItems, notes } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { AppHeader } from '@/components/layout/app-header';
import { BriefView } from '@/components/brief/brief-view';
import { BriefAudioPlayer } from '@/components/audio/brief-audio-player';
import { QuickReflection } from '@/components/reflection/quick-reflection';
import { formatDate } from '@/lib/utils';
import { BookOpen, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function BriefPage() {
  const session = await requireOnboarding();
  const userId = session.user.id;

  // Get the latest digest
  const [latestDigest] = await db.select()
    .from(digests)
    .where(and(eq(digests.userId, userId), eq(digests.status, 'ready')))
    .orderBy(desc(digests.digestDate))
    .limit(1);

  let items: any[] = [];
  let userNotes: any[] = [];

  if (latestDigest) {
    // Get digest items
    items = await db.select()
      .from(digestItems)
      .where(eq(digestItems.digestId, latestDigest.id))
      .orderBy(digestItems.position);

    // Get user notes for these items
    const itemIds = items.map(i => i.id);
    if (itemIds.length > 0) {
      userNotes = await db.select()
        .from(notes)
        .where(and(
          eq(notes.userId, userId),
        ));
    }
  }

  const notesByItemId = new Map(userNotes.map(n => [n.digestItemId, n]));

  return (
    <div className="min-h-screen bg-surface-50">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Quick reflection with voice input */}
        <QuickReflection userName={session.user.name || 'there'} />

        {latestDigest ? (
          <>
            {/* Brief header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="font-display text-display text-surface-900 mb-1">
                  Your Daily Brief
                </h1>
                <p className="text-surface-500 text-sm">
                  {formatDate(latestDigest.digestDate)} · {items.length} items · {latestDigest.totalWordCount} words
                </p>
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost p-2 text-surface-300">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button className="btn-ghost p-2 text-surface-300">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Audio player */}
            <div className="mb-8">
              <BriefAudioPlayer digestId={latestDigest.id} />
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
              }))}
              digestId={latestDigest.id}
            />

            {/* Export button */}
            <div className="mt-10 text-center">
              <form action="/api/export" method="POST">
                <button type="submit" className="btn-secondary">
                  Export reflections to Google Doc
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-8 h-8 text-brand-600" />
            </div>
            <h2 className="font-display text-display-sm text-surface-900 mb-2">
              Your first brief is being prepared
            </h2>
            <p className="text-surface-500 text-sm max-w-sm mx-auto mb-6">
              We're gathering and personalizing today's news for you. 
              This usually takes about a minute.
            </p>
            <Link href="/api/generate-brief" className="btn-primary">
              <RefreshCw className="w-4 h-4" />
              Generate now
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
