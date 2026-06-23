import { db } from '@/lib/db';
import { users, userPreferences, digests, digestItems } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { generateCompanyBrief } from '@/lib/research/discover';
import { sendBriefEmail } from '@/lib/services/email';
import { formatDate, wordCount } from '@/lib/utils';
import type { UserProfilePayload, GoalEntry } from '@/types';

/**
 * Build the profile payload from stored preferences (no external deps).
 */
function buildProfilePayload(prefs: {
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
    seniority: prefs.seniority || 'Founder',
    industries: prefs.industries || [],
    geography: prefs.geography || 'Global',
    professionalBackground: prefs.linkedinText || prefs.resumeText || 'Not provided',
  };
}

/**
 * Generate the daily company brief for a single user.
 *
 * Pipeline:
 * 1. Reuse today's ready digest if it exists
 * 2. Research via Claude + web search (3 AI bullets + 3 people to meet)
 * 3. Enrich people with MX-validated, inferred contact emails
 * 4. Store digest + items
 * 5. Send email (if enabled)
 */
export async function generateBriefForUser(userId: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[Pipeline] Starting company brief for user ${userId}`);

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error(`User ${userId} not found`);

  const [prefs] = await db.select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  if (!prefs) throw new Error(`Preferences not found for user ${userId}`);

  const today = new Date().toISOString().split('T')[0];

  // Reuse an existing ready digest for today.
  const [existingReady] = await db.select()
    .from(digests)
    .where(and(
      eq(digests.userId, userId),
      eq(digests.digestDate, today),
      eq(digests.status, 'ready'),
    ))
    .limit(1);
  if (existingReady) {
    console.log(`[Pipeline] Reusing existing digest for ${userId} (${today})`);
    return existingReady.id;
  }

  const [digest] = await db.insert(digests).values({
    userId,
    digestDate: today,
    status: 'generating',
  }).returning();

  try {
    const profile = buildProfilePayload(prefs);
    const brief = await generateCompanyBrief(profile, today);

    if (brief.aiNews.length === 0 && brief.people.length === 0) {
      await db.update(digests).set({ status: 'failed', updatedAt: new Date() }).where(eq(digests.id, digest.id));
      throw new Error('Brief generation returned no items');
    }

    // Store AI news bullets.
    for (const n of brief.aiNews) {
      await db.insert(digestItems).values({
        digestId: digest.id,
        itemType: 'ai_news',
        position: n.position,
        title: n.title,
        summary: n.summary,
        whyItMatters: n.whyItMatters,
        topics: n.topics,
        sourceLinks: n.sourceLinks,
      });
    }

    // Store people to meet.
    for (const p of brief.people) {
      await db.insert(digestItems).values({
        digestId: digest.id,
        itemType: 'person',
        position: p.position,
        title: p.companyName || p.personName,
        summary: p.companyOneLiner,
        whyItMatters: p.whyMeet,
        sourceLinks: p.sourceLinks,
        personName: p.personName,
        personRole: p.personRole,
        companyName: p.companyName,
        companyOneLiner: p.companyOneLiner,
        ceoCpoName: p.ceoCpoName,
        ceoCpoRole: p.ceoCpoRole,
        companyDomain: p.companyDomain,
        domainMailable: p.domainMailable,
        mailProvider: p.mailProvider,
        candidateEmails: p.candidateEmails,
        linkedinUrl: p.linkedinUrl,
        whyMeet: p.whyMeet,
      });
    }

    const newsWords = brief.aiNews.reduce(
      (sum, n) => sum + wordCount(n.summary || '') + wordCount(n.whyItMatters || ''), 0);
    const peopleWords = brief.people.reduce(
      (sum, p) => sum + wordCount(p.companyOneLiner || '') + wordCount(p.whyMeet || ''), 0);
    const totalWords = newsWords + peopleWords;

    await db.update(digests).set({
      status: 'ready',
      totalWordCount: totalWords,
      generatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(digests.id, digest.id));

    if (user.emailBriefEnabled) {
      await sendBriefEmail(user.email, {
        userName: user.name,
        briefDate: formatDate(today),
        aiNews: brief.aiNews,
        people: brief.people,
        appUrl: process.env.APP_URL || 'http://localhost:3000',
      });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Pipeline] Brief generated for ${user.email} in ${elapsed}s (${brief.aiNews.length} news, ${brief.people.length} people)`);

    return digest.id;
  } catch (error) {
    console.error(`[Pipeline] Failed for user ${userId}:`, error);
    await db.update(digests).set({ status: 'failed', updatedAt: new Date() }).where(eq(digests.id, digest.id));
    throw error;
  }
}

/**
 * Generate briefs for all onboarded users (called by cron).
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
