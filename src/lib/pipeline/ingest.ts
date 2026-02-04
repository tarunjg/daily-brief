import Parser from 'rss-parser';
import { db } from '@/lib/db';
import { articles } from '@/lib/db/schema';
import { RSS_SOURCES, INTEREST_TO_CATEGORIES } from './sources';
import { contentHash, normalizeUrl, truncateToTokens } from '@/lib/utils';
import { eq } from 'drizzle-orm';
import type { RSSSource, RawArticle } from '@/types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'DailyBrief/1.0 (RSS Reader)',
  },
});

/**
 * Fetch and parse a single RSS feed.
 * Returns normalized article objects, or empty array on failure.
 */
async function fetchFeed(source: RSSSource): Promise<Partial<RawArticle>[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).slice(0, 20); // Max 20 items per feed

    return items.map(item => {
      const url = item.link || item.guid || '';
      const title = item.title || '';
      const content = item.contentSnippet || item.content || item.summary || '';
      const published = item.pubDate ? new Date(item.pubDate) : new Date();

      return {
        sourceUrl: url,
        title: title.trim(),
        rawContent: truncateToTokens(content, 500),
        sourceName: source.name,
        publishedAt: published,
        topics: [source.category],
        contentHash: contentHash(title, content),
      };
    }).filter(a => a.sourceUrl && a.title);
  } catch (error) {
    console.error(`Failed to fetch feed ${source.name}:`, error);
    return [];
  }
}

/**
 * Extract full article content using readability.
 * Falls back to the RSS snippet if extraction fails.
 */
async function extractArticleContent(url: string, fallbackContent: string): Promise<string> {
  try {
    // Dynamic import to handle the ESM module
    const { extract } = await import('@extractus/article-extractor');
    const article = await extract(url, {
      timeout: 8000,
    } as Parameters<typeof extract>[1]);
    if (article?.content) {
      // Strip HTML tags and truncate
      const text = article.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return truncateToTokens(text, 2000);
    }
  } catch (error) {
    console.error(`Article extraction failed for ${url}:`, error);
  }
  return fallbackContent;
}

/**
 * Deduplicate articles by URL normalization and content hash.
 */
function deduplicateArticles(rawArticles: Partial<RawArticle>[]): Partial<RawArticle>[] {
  const seen = new Map<string, Partial<RawArticle>>();
  const seenHashes = new Set<string>();

  for (const article of rawArticles) {
    if (!article.sourceUrl || !article.title) continue;

    const normalizedUrl = normalizeUrl(article.sourceUrl);
    const hash = article.contentHash || '';

    // Skip if URL or content hash already seen
    if (seen.has(normalizedUrl) || seenHashes.has(hash)) continue;

    seen.set(normalizedUrl, article);
    if (hash) seenHashes.add(hash);
  }

  return Array.from(seen.values());
}

/**
 * Run the full ingestion pipeline.
 * Fetches all configured RSS sources, deduplicates, and stores new articles.
 * 
 * @param userInterests - Optional: filter sources to categories matching these interests
 * @returns Count of new articles stored
 */
export async function runIngestionPipeline(userInterests?: string[]): Promise<number> {
  console.log('[Ingestion] Starting pipeline...');

  // Filter sources based on user interests if provided
  let sourcesToFetch = RSS_SOURCES;
  if (userInterests && userInterests.length > 0) {
    const relevantCategories = new Set<string>();
    for (const interest of userInterests) {
      const categories = INTEREST_TO_CATEGORIES[interest] || [];
      categories.forEach(c => relevantCategories.add(c));
    }
    // Always include General category
    relevantCategories.add('General');
    sourcesToFetch = RSS_SOURCES.filter(s => relevantCategories.has(s.category));
  }

  console.log(`[Ingestion] Fetching ${sourcesToFetch.length} sources...`);

  // Fetch all feeds in parallel (with concurrency limit)
  const BATCH_SIZE = 8;
  const allArticles: Partial<RawArticle>[] = [];

  for (let i = 0; i < sourcesToFetch.length; i += BATCH_SIZE) {
    const batch = sourcesToFetch.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(s => fetchFeed(s)));
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    }
  }

  console.log(`[Ingestion] Fetched ${allArticles.length} raw articles`);

  // Deduplicate
  const unique = deduplicateArticles(allArticles);
  console.log(`[Ingestion] ${unique.length} unique articles after dedup`);

  // Filter to last 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recent = unique.filter(a => {
    if (!a.publishedAt) return true; // Include if no date
    return a.publishedAt > cutoff;
  });

  console.log(`[Ingestion] ${recent.length} articles within 48h window`);

  // Upsert into database
  let newCount = 0;
  for (const article of recent) {
    try {
      // Check if already exists
      const existing = await db.select({ id: articles.id })
        .from(articles)
        .where(eq(articles.sourceUrl, article.sourceUrl!))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(articles).values({
          sourceUrl: article.sourceUrl!,
          title: article.title!,
          rawContent: article.rawContent || '',
          sourceName: article.sourceName || 'Unknown',
          publishedAt: article.publishedAt,
          topics: article.topics || [],
          contentHash: article.contentHash || '',
        });
        newCount++;
      }
    } catch (error) {
      // Skip duplicates (unique constraint)
      console.error(`[Ingestion] Failed to store article: ${article.title}`, error);
    }
  }

  console.log(`[Ingestion] Stored ${newCount} new articles`);
  return newCount;
}

/**
 * Extract full content for top candidate articles.
 * Called after ranking to enrich the articles before summarization.
 */
export async function enrichArticleContent(articleIds: string[]): Promise<void> {
  for (const id of articleIds) {
    const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    if (!article) continue;

    // Only extract if we have a short snippet (< 500 chars)
    if (article.rawContent && article.rawContent.length > 500) continue;

    const fullContent = await extractArticleContent(article.sourceUrl, article.rawContent || '');
    await db.update(articles).set({
      rawContent: fullContent,
    }).where(eq(articles.id, id));
  }
}
