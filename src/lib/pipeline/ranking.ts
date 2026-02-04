import OpenAI from 'openai';
import { db } from '@/lib/db';
import { articles, userPreferences } from '@/lib/db/schema';
import { desc, gte } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import type { GoalEntry, UserProfilePayload } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Compute embedding for a text string using OpenAI.
 */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // Max input length
  });
  return response.data[0].embedding;
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build a user profile text from their preferences for embedding.
 */
export function buildUserProfileText(prefs: {
  interests: string[] | null;
  goals: unknown;
  roleTitle: string | null;
  seniority: string | null;
  industries: string[] | null;
  geography: string | null;
  linkedinText: string | null;
  resumeText: string | null;
}): string {
  const goals = (prefs.goals as GoalEntry[] || []).map(g => g.text).join('. ');
  const interests = (prefs.interests || []).join(', ');
  const industries = (prefs.industries || []).join(', ');
  const background = prefs.linkedinText || prefs.resumeText || '';

  return [
    `Role: ${prefs.roleTitle || 'Professional'} (${prefs.seniority || 'unknown level'})`,
    `Industries: ${industries}`,
    `Interests: ${interests}`,
    `Goals: ${goals}`,
    background ? `Background: ${background.slice(0, 1000)}` : '',
  ].filter(Boolean).join('\n');
}

/**
 * Build the UserProfilePayload for the LLM prompt.
 */
export function buildProfilePayload(prefs: {
  interests: string[] | null;
  goals: unknown;
  roleTitle: string | null;
  seniority: string | null;
  industries: string[] | null;
  geography: string | null;
  linkedinText: string | null;
  resumeText: string | null;
}): UserProfilePayload {
  const goals = (prefs.goals as GoalEntry[] || []).map(g => g.text);
  return {
    interests: prefs.interests || [],
    goals,
    roleTitle: prefs.roleTitle || 'Professional',
    seniority: prefs.seniority || 'IC',
    industries: prefs.industries || [],
    geography: prefs.geography || 'Global',
    professionalBackground: prefs.linkedinText || prefs.resumeText || 'Not provided',
  };
}

interface RankedArticleResult {
  id: string;
  sourceUrl: string;
  title: string;
  rawContent: string | null;
  sourceName: string | null;
  publishedAt: Date | null;
  topics: string[] | null;
  similarity: number;
}

/**
 * Rank articles by relevance to a user's profile.
 * 
 * Step 1: Get all recent articles (last 48h)
 * Step 2: Embed user profile + all article titles
 * Step 3: Compute cosine similarity
 * Step 4: Return top N candidates, deduplicated by topic diversity
 * 
 * @returns Top candidates sorted by relevance
 */
export async function rankArticlesForUser(
  userId: string,
  topN: number = 20,
): Promise<RankedArticleResult[]> {
  // Get user preferences
  const [prefs] = await db.select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (!prefs) {
    console.error(`[Ranking] No preferences found for user ${userId}`);
    return [];
  }

  // Get recent articles (last 48 hours)
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentArticles = await db.select()
    .from(articles)
    .where(gte(articles.publishedAt, cutoff))
    .orderBy(desc(articles.publishedAt))
    .limit(100);

  if (recentArticles.length === 0) {
    console.warn('[Ranking] No recent articles found');
    return [];
  }

  console.log(`[Ranking] Ranking ${recentArticles.length} articles for user ${userId}`);

  // Build user profile embedding
  const profileText = buildUserProfileText(prefs);
  const profileEmbedding = await getEmbedding(profileText);

  // Embed all article titles + snippets (batch for efficiency)
  const articleTexts = recentArticles.map(a =>
    `${a.title}. ${(a.rawContent || '').slice(0, 200)}`
  );

  // Batch embed (OpenAI supports up to 2048 inputs)
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: articleTexts.map(t => t.slice(0, 8000)),
  });

  // Score each article
  const scored: RankedArticleResult[] = recentArticles.map((article, i) => ({
    id: article.id,
    sourceUrl: article.sourceUrl,
    title: article.title,
    rawContent: article.rawContent,
    sourceName: article.sourceName,
    publishedAt: article.publishedAt,
    topics: article.topics,
    similarity: cosineSimilarity(profileEmbedding, embeddingResponse.data[i].embedding),
  }));

  // Sort by similarity
  scored.sort((a, b) => b.similarity - a.similarity);

  // Enforce topic diversity: max 3 per topic cluster
  const topicCounts = new Map<string, number>();
  const diverse: RankedArticleResult[] = [];

  for (const article of scored) {
    if (diverse.length >= topN) break;

    const mainTopic = (article.topics && article.topics[0]) || 'General';
    const count = topicCounts.get(mainTopic) || 0;
    if (count >= 3) continue;

    topicCounts.set(mainTopic, count + 1);
    diverse.push(article);
  }

  console.log(`[Ranking] Selected ${diverse.length} diverse candidates`);
  return diverse;
}

/**
 * Semantic deduplication: cluster articles by embedding similarity
 * and keep only the best from each cluster.
 */
export async function semanticDedup(
  articleList: RankedArticleResult[],
  threshold: number = 0.92,
): Promise<RankedArticleResult[]> {
  if (articleList.length <= 1) return articleList;

  // Embed all articles
  const texts = articleList.map(a => `${a.title}. ${(a.rawContent || '').slice(0, 200)}`);
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map(t => t.slice(0, 8000)),
  });
  const embeddings = response.data.map(d => d.embedding);

  // Simple greedy clustering
  const kept = new Set<number>();
  const removed = new Set<number>();

  for (let i = 0; i < articleList.length; i++) {
    if (removed.has(i)) continue;
    kept.add(i);

    for (let j = i + 1; j < articleList.length; j++) {
      if (removed.has(j)) continue;
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      if (sim >= threshold) {
        removed.add(j);
      }
    }
  }

  return articleList.filter((_, i) => kept.has(i));
}
