import { db } from '@/lib/db';
import { users, userPreferences, digests, digestItems, articles } from '@/lib/db/schema';
import { and, eq, desc, inArray } from 'drizzle-orm';
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
const INGESTION_MIN_INTERVAL_MS = 30 * 60 * 1000;

interface GenerateBriefOptions {
  skipIngestion?: boolean;
  forceIngestion?: boolean;
}

export async function generateBriefForUser(
  userId: string,
  options: GenerateBriefOptions = {},
): Promise<string> {
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

  // If a digest already exists for today, reuse it (avoid duplicates on concurrent runs).
  const [existingDigest] = await db.select()
    .from(digests)
    .where(and(
      eq(digests.userId, userId),
      eq(digests.digestDate, today),
    ))
    .limit(1);
  if (existingDigest) {
    console.log(`[Pipeline] Reusing existing digest for ${userId} (${today})`);
    return existingDigest.id;
  }

  // Create digest record
  const [digest] = await db.insert(digests).values({
    userId,
    digestDate: today,
    status: 'generating',
  }).returning();

  try {
    // Step 1: Ingest (skip if recently ingested or explicitly disabled)
    if (!options.skipIngestion) {
      let shouldIngest = true;
      if (!options.forceIngestion) {
        const [latestArticle] = await db.select({ createdAt: articles.createdAt })
          .from(articles)
          .orderBy(desc(articles.createdAt))
          .limit(1);
        if (latestArticle?.createdAt) {
          const ageMs = Date.now() - new Date(latestArticle.createdAt).getTime();
          shouldIngest = ageMs > INGESTION_MIN_INTERVAL_MS;
        }
      }
      if (shouldIngest) {
        await runIngestionPipeline(prefs.interests || []);
      } else {
        console.log('[Pipeline] Skipping ingestion (recently ingested)');
      }
    }

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
    const sourceUrls = articlePayloads.map(a => a.sourceUrl);
    const articleRows = sourceUrls.length === 0 ? [] : await db.select({
      id: articles.id,
      sourceUrl: articles.sourceUrl,
    })
      .from(articles)
      .where(inArray(articles.sourceUrl, sourceUrls));
    const articleIdByUrl = new Map(articleRows.map(row => [row.sourceUrl, row.id]));

    for (const item of brief.items) {
      const matchingLink = item.sourceLinks.find(link => articleIdByUrl.has(link.url));
      const articleId = matchingLink ? articleIdByUrl.get(matchingLink.url) : undefined;
      if (!articleId) continue;

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

  if (allUsers.length === 0) return;

  // Run ingestion once for the union of all user interests.
  const userIds = allUsers.map(u => u.id);
  const allPrefs = await db.select({ interests: userPreferences.interests })
    .from(userPreferences)
    .where(inArray(userPreferences.userId, userIds));
  const interestSet = new Set<string>();
  for (const prefs of allPrefs) {
    (prefs.interests || []).forEach(interest => interestSet.add(interest));
  }
  const combinedInterests = Array.from(interestSet);

  try {
    await runIngestionPipeline(combinedInterests);
  } catch (error) {
    console.error('[Pipeline] Ingestion failed before cron run:', error);
  }

  for (const user of allUsers) {
    try {
      await generateBriefForUser(user.id, { skipIngestion: true });
    } catch (error) {
      console.error(`[Pipeline] Skipping user ${user.email}:`, error);
    }
  }
}
