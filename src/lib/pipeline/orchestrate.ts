import { db } from '@/lib/db';
import { users, userPreferences, digests, digestItems, articles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { runIngestionPipeline } from './ingest';
import { rankArticlesForUser, semanticDedup, buildProfilePayload } from './ranking';
import { generateBrief } from '@/lib/prompts/generate';
import { sendBriefEmail } from '@/lib/services/email';
import { formatDate, formatShortDate } from '@/lib/utils';
import type { ArticlePayload } from '@/types';

/**
 * Generate a daily brief for a single user.
 * This is the main orchestration function called by the cron job.
 * 
 * Pipeline:
 * 1. Ingest new articles (shared across users)
 * 2. Rank articles for this user
 * 3. Semantic dedup
 * 4. Generate personalized brief via LLM
 * 5. Store digest + items
 * 6. Send email (if enabled)
 */
export async function generateBriefForUser(userId: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[Pipeline] Starting brief generation for user ${userId}`);

  // Get user + preferences
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error(`User ${userId} not found`);

  const [prefs] = await db.select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  if (!prefs) throw new Error(`Preferences not found for user ${userId}`);

  const today = new Date().toISOString().split('T')[0];

  // Check if brief already exists for today
  const existingDigest = await db.select()
    .from(digests)
    .where(eq(digests.userId, userId))
    .limit(1);
  // In production, also filter by digestDate = today
  // For now, we allow regeneration

  // Create digest record
  const [digest] = await db.insert(digests).values({
    userId,
    digestDate: today,
    status: 'generating',
  }).returning();

  try {
    // Step 1: Ingest (if needed — in production, this runs on a separate schedule)
    await runIngestionPipeline(prefs.interests || []);

    // Step 2: Rank articles for this user
    const ranked = await rankArticlesForUser(userId, 20);
    if (ranked.length === 0) {
      await db.update(digests).set({ status: 'failed', updatedAt: new Date() }).where(eq(digests.id, digest.id));
      throw new Error('No articles available for ranking');
    }

    // Step 3: Semantic dedup
    const deduped = await semanticDedup(ranked, 0.92);

    // Step 4: Build article payloads for the LLM
    const articlePayloads: ArticlePayload[] = deduped.slice(0, 15).map((a, i) => ({
      index: i + 1,
      title: a.title,
      sourceUrl: a.sourceUrl,
      sourceName: a.sourceName || 'Unknown',
      publishedAt: a.publishedAt?.toISOString() || today,
      content: (a.rawContent || '').slice(0, 2000),
    }));

    // Step 5: Generate the brief
    const profile = buildProfilePayload(prefs);
    const brief = await generateBrief(profile, articlePayloads, today);

    // Step 6: Store digest items
    for (const item of brief.items) {
      // Find or create the article record
      const matchingPayload = articlePayloads.find(a =>
        item.sourceLinks.some(link => link.url === a.sourceUrl)
      );

      let articleId: string;
      if (matchingPayload) {
        const [existing] = await db.select({ id: articles.id })
          .from(articles)
          .where(eq(articles.sourceUrl, matchingPayload.sourceUrl))
          .limit(1);
        articleId = existing?.id || '';
      } else {
        articleId = '';
      }

      if (articleId) {
        await db.insert(digestItems).values({
          digestId: digest.id,
          articleId,
          position: item.position,
          title: item.title,
          summary: item.summary,
          whyItMatters: item.whyItMatters,
          relevanceScore: item.relevanceScore,
          topics: item.topics,
          sourceLinks: item.sourceLinks,
        });
      }
    }

    // Update digest status
    await db.update(digests).set({
      status: 'ready',
      totalWordCount: brief.totalWordCount,
      generatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(digests.id, digest.id));

    // Step 7: Send email if enabled
    if (user.emailBriefEnabled) {
      await sendBriefEmail(user.email, {
        userName: user.name,
        briefDate: formatDate(today),
        items: brief.items,
        appUrl: process.env.APP_URL || 'http://localhost:3000',
      });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Pipeline] Brief generated for ${user.email} in ${elapsed}s (${brief.items.length} items, ${brief.totalWordCount} words)`);

    return digest.id;
  } catch (error) {
    console.error(`[Pipeline] Failed for user ${userId}:`, error);
    await db.update(digests).set({
      status: 'failed',
      updatedAt: new Date(),
    }).where(eq(digests.id, digest.id));
    throw error;
  }
}

/**
 * Generate briefs for all users (called by cron).
 * Groups users by timezone and processes sequentially.
 */
export async function generateBriefsForAllUsers(): Promise<void> {
  const allUsers = await db.select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.onboardingCompleted, true));

  console.log(`[Pipeline] Generating briefs for ${allUsers.length} users`);

  for (const user of allUsers) {
    try {
      await generateBriefForUser(user.id);
    } catch (error) {
      console.error(`[Pipeline] Skipping user ${user.email}:`, error);
    }
  }
}
