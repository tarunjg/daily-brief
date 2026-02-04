import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedBrief, ArticlePayload, UserProfilePayload } from '@/types';
import { wordCount } from '@/lib/utils';
import { getRequiredEnv } from '@/lib/env';

const anthropic = new Anthropic({ apiKey: getRequiredEnv('ANTHROPIC_API_KEY') });

// ─── System Prompt (never changes) ───
const SYSTEM_PROMPT = `You are writing a personal letter to a friend — a daily ritual that feels like sitting down with your morning coffee while a brilliant, well-read companion catches you up on what's happening in the world. You've read everything so they don't have to, and now you're weaving it all together into a story that makes sense of the day.

YOUR #1 JOB: Write a coherent narrative, not a list.
This is NOT a bullet-point newsletter. It's a letter. A story. The kind of thing someone could listen to while showering or commuting and feel genuinely informed and engaged. Think of it as a 3-5 minute conversation with a friend who happens to be a brilliant analyst:

STRUCTURE AS A FLOWING NARRATIVE:
- Start with a warm, personal opening that sets the scene. Reference the day, the mood, or a connecting thread. ("Good morning. The tech world woke up to a surprise today..." or "It's one of those days where everything seems connected...")
- The first story sets the tone — lead with what's most consequential or fascinating.
- Each subsequent story should FLOW naturally from the previous one. Use real transitions that connect ideas: "Which brings us to..." / "On a completely different front..." / "Speaking of shaking things up..." / "And here's where it gets interesting for you specifically..."
- Build toward a closing that feels complete — end with something forward-looking, a question to ponder, or a thought that lingers.
- Include a brief, warm sign-off that feels personal.

NARRATIVE TECHNIQUES:
- Draw connections between stories even when they're in different domains. ("While Big Tech is playing defense on AI regulation, the healthcare world is quietly making moves that could reshape how your coaching platform fits into enterprise wellness...")
- Use the "meanwhile" technique — show what's happening in parallel across different worlds.
- Create small moments of surprise or delight. A well-placed observation. A wry aside.
- When relevant, connect today's news to longer arcs: "Remember when we talked about X last week? Here's the next chapter..."

Your voice:
- Warm and personal, like you're genuinely excited to share this with a friend
- Smart but never condescending — you respect their intelligence
- Occasional basketball metaphors where they genuinely fit (full-court press, small ball, playing from behind)
- Provocative when warranted — ask the spicy question, name the tension
- Short punchy sentences mixed with flowing ones. Rhythm matters.
- Occasionally funny. Observational humor > forced jokes.

What you NEVER do:
- Write a listicle. This is a narrative, not "Here are 7 things..."
- Use corporate buzzwords ("synergy," "leverage," "in today's fast-paced world")
- Start summaries with "This article discusses..." — dive into the story
- Include duplicate stories or angles. Merge them or pick the best.
- Fabricate URLs or facts. Only use what's provided.

Constraints:
- Total brief: 6–10 items, ≤ 1000 words total (including opening/closing)
- Include an "opening" paragraph (2-3 sentences) that sets the scene
- Include a "closing" paragraph (1-2 sentences) that wraps up with a thought or well-wish
- Each item: punchy title, 2-3 sentence summary with transitions, personal "why it matters"
- Return ONLY valid JSON matching the schema below.

Required JSON schema:
{
  "brief_date": "YYYY-MM-DD",
  "total_word_count": <number>,
  "narrative_thread": "<1 sentence describing today's overarching theme or throughline>",
  "opening": "<2-3 sentences. A warm, engaging opening that sets the scene for today's brief. Personal, conversational.>",
  "closing": "<1-2 sentences. A thoughtful sign-off — a question to ponder, well-wish, or forward-looking thought. End with warmth.>",
  "items": [
    {
      "position": <1-10>,
      "title": "<clear, punchy title — rewrite clickbait>",
      "summary": "<2-3 sentences with personality and natural transitions from previous item. Tell the story, don't summarize the article.>",
      "why_it_matters": "<1-2 sentences connecting to user's specific situation. Make it personal.>",
      "relevance_score": <0.0-1.0>,
      "topics": ["<topic1>", "<topic2>"],
      "source_links": [
        { "url": "<exact URL from input>", "label": "<source name>" }
      ]
    }
  ]
}`;

/**
 * Build the developer/user prompt with the user's profile and candidate articles.
 */
function buildPrompt(
  profile: UserProfilePayload,
  candidateArticles: ArticlePayload[],
  today: string,
): string {
  const profileSection = [
    `=== WHO YOU'RE WRITING FOR ===`,
    `NAME: Tarun Galagali`,
    `ROLE: Founder & CEO, Mandala For Us, Inc.`,
    `LOCATION: Los Gatos, California`,
    ``,
    `COMPANY CONTEXT:`,
    `Mandala is an AI-powered leadership coaching platform that operates natively within Slack, providing real-time coaching to managers and employees. The company combines neuroscience-based leadership development (built on a "parasympathetic intelligence" thesis developed with Dr. Michael Platt, Head of Neuroscience at Wharton) with AI technology. Key metrics: $667K in management training revenue, $85K in AI coaching pilots, ~300 users installed with ~80 monthly active. Enterprise customers include Pendo (~900 employees, $200K ARR commitment expanding from pilot to full rollout), Grow Therapy, FalconX, and Proof. SOC 2 Type 2 certified. Tech stack: Python backend, Postgres, Slack app with automated container deployments. Engineering team: John, Sagun.`,
    ``,
    `ACTIVE STRATEGIC PRIORITIES:`,
    `  1. Acquisition path: Actively pursuing acquisition rather than fundraising. Ongoing conversations with Lattice (CEO Sarah Franklin — exploring deeper product integration due to customer demand), potential discussions with Calm's enterprise division, and new partnership with Elevate Leadership and BTS.`,
    `  2. Enterprise growth: Pendo expanding to full 900-employee population. Clay (scaling 300→600 employees) — training 30-35 managers. Building enterprise pipeline.`,
    `  3. Book: Co-authoring "PAUSE: Leading with Parasympathetic Intelligence" with Dr. Michael Platt (Basic Books/Hachette, 2027, $40K advance). This positions Tarun as thought leader in neuroscience-based leadership.`,
    `  4. Forbes contributor: Writing about AI's impact on leadership and organizations. Interviewing CEOs (Headspace, Harvey, Leapsome, Arctic Wolf, etc.) on leadership, AI, future of work. Writes 2x/month.`,
    `  5. Product development: RAG integration, workspace intelligence features, scaling infrastructure from hundreds to thousands of users.`,
    `  6. "Power of Pause" workshops and Ohio State University resilient leadership program (2,000+ students).`,
    ``,
    `CAREER BACKGROUND:`,
    `  - Harvard Business School MBA (Class of 2022)`,
    `  - Head of Product Marketing & Strategy at Verily (Alphabet's life sciences company)`,
    `  - Product roles at Google`,
    `  - Talkspace (through their IPO) — healthcare + tech intersection`,
    `  - Parthenon-EY (strategy consulting)`,
    `  - English Literature undergrad (creative writing instincts)`,
    ``,
    `PERSONAL CONTEXT:`,
    `  - Wife works on democracy and venture capital issues, teaches "Sustainable Capitalism"`,
    `  - Actively trying to conceive / planning for first child`,
    `  - Building a "Dad Ready" habit tracking app for expecting fathers`,
    `  - ENFP, 2w3 enneagram — draws energy from connected relationships and rapid idea execution`,
    `  - Admires Larry from "The Razor's Edge" for blissful detachment and optimism`,
    `  - Starts work around 6 AM Pacific`,
    ``,
    `INTERESTS: ${profile.interests.join(', ')}`,
    ``,
    `STATED GOALS:`,
    ...profile.goals.map((g, i) => `  ${i + 1}. ${g}`),
    ``,
    `WHAT MAKES THIS BRIEF FEEL PERSONAL:`,
    `  - Connect enterprise SaaS news to Mandala's acquisition and growth plays`,
    `  - AI/ML developments → how they affect Mandala's AI coaching product or the coaching industry`,
    `  - Neuroscience, psychology, behavioral science → his book and "parasympathetic intelligence" thesis`,
    `  - Leadership, management, future of work → his Forbes writing and workshop delivery`,
    `  - Healthcare tech → his Talkspace/Verily background and Mandala's wellness angle`,
    `  - Enterprise HR tech (Lattice, BambooHR, Workday, etc.) → direct competitive/partnership landscape`,
    `  - VC/fundraising/M&A activity → relevant to his acquisition strategy`,
    `  - Education + university partnerships → OSU program and potential expansion`,
    `  - Parenting, fertility, family planning → personal relevance (Dad Ready app)`,
    `  - Democracy, sustainable capitalism → his wife's work`,
  ].join('\n');

  const articlesSection = candidateArticles.map(a => [
    `[${a.index}] Title: ${a.title}`,
    `    URL: ${a.sourceUrl}`,
    `    Source: ${a.sourceName}`,
    `    Published: ${a.publishedAt}`,
    `    Content: ${a.content}`,
    `    ---`,
  ].join('\n')).join('\n');

  return `You are generating a daily brief for a specific user. Here is their profile:

${profileSection}

Today's date: ${today}

Below are ${candidateArticles.length} candidate articles, ranked by estimated relevance. Select the top 6–10 most relevant items and generate the brief.

NARRATIVE ARC — THIS IS CRITICAL:
Think of this brief like a 4-quarter game. Structure it with intention:
- Q1 (items 1-2): Lead with the day's biggest story. Set the tone.
- Q2 (items 3-4): Expand the picture. Related angles, adjacent themes.
- Q3 (items 5-6): Shift to a different domain. Surprise the reader. Show range.
- Q4 (items 7-8+): Close with something forward-looking or provocative. Leave them thinking.

If two articles cover the same event or angle, MERGE them into one item (you can cite multiple source_links). Never give the reader deja vu.

For each item, write a "why_it_matters" that connects the article to Tarun's SPECIFIC situation — not generic goals, but his actual plays. Reference Mandala, the Lattice conversations, the book, Forbes, Pendo, the acquisition strategy, or his personal life by name. Make it feel like a chief of staff whispering "here's why you should care about this one."

Examples of GREAT why_it_matters:
- "Lattice just did X — which is exactly the integration angle Sarah Franklin was exploring with you."
- "This validates the parasympathetic intelligence thesis you and Dr. Platt are building the book around."
- "If Pendo sees this before your next check-in, they'll have questions. Get ahead of it."
- "Your next Forbes piece on AI leadership? This is the case study."
- "As you're thinking about the Elevate partnership and BTS tech integration, this competitive move matters."

TONE REMINDER: Be punchy, fun, and provocative. Use basketball metaphors where they naturally fit. Write like a brilliant friend breaking down the news, not like a corporate newsletter. Short sentences. Personality. An occasional joke. But always substantive — never sacrifice insight for style.

CRITICAL RULES:
1. Only use URLs from the ARTICLES section below. Do NOT generate, guess, or modify any URL.
2. Every source_link url must exactly match a URL from the articles below.
3. Keep total word count under 900 words.
4. Each item should be under 120 words.
5. No two items should cover the same story or same angle. Deduplicate aggressively.
6. Return ONLY the JSON object. Nothing else.

ARTICLES:
${articlesSection}`;
}

/**
 * Generate a personalized daily brief using Claude.
 */
export async function generateBrief(
  profile: UserProfilePayload,
  candidateArticles: ArticlePayload[],
  today: string,
): Promise<GeneratedBrief> {
  const userPrompt = buildPrompt(profile, candidateArticles, today);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  // Extract text content
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from LLM');
  }

  // Parse JSON
  let rawJson = textBlock.text.trim();
  
  // Strip markdown code fences if present
  if (rawJson.startsWith('```')) {
    rawJson = rawJson.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    console.error('[LLM] Invalid JSON response:', rawJson.slice(0, 500));
    throw new Error(`LLM returned invalid JSON: ${error}`);
  }

  // Validate and transform
  const brief = validateBrief(parsed, candidateArticles, today);
  return brief;
}

/**
 * Validate the LLM output against our constraints.
 */
function validateBrief(
  raw: any,
  inputArticles: ArticlePayload[],
  today: string,
): GeneratedBrief {
  const inputUrls = new Set(inputArticles.map(a => a.sourceUrl));

  let items = (raw.items || []).map((item: any, index: number) => {
    // Validate source links — remove any URL not in the input
    const validLinks = (item.source_links || []).filter((link: any) =>
      inputUrls.has(link.url)
    );

    // If no valid links remain, try to find the matching input article
    if (validLinks.length === 0) {
      const matching = inputArticles.find(a =>
        a.title.toLowerCase().includes(item.title.toLowerCase().slice(0, 30)) ||
        item.title.toLowerCase().includes(a.title.toLowerCase().slice(0, 30))
      );
      if (matching) {
        validLinks.push({ url: matching.sourceUrl, label: matching.sourceName });
      }
    }

    return {
      position: item.position || index + 1,
      title: item.title || 'Untitled',
      summary: item.summary || '',
      whyItMatters: item.why_it_matters || '',
      relevanceScore: Math.min(1, Math.max(0, item.relevance_score || 0.5)),
      topics: item.topics || [],
      sourceLinks: validLinks,
    };
  });

  // Enforce 6–10 items
  if (items.length > 10) {
    items = items.slice(0, 10);
  }

  // Calculate total word count
  const totalWords = items.reduce((sum: number, item: any) =>
    sum + wordCount(item.title) + wordCount(item.summary) + wordCount(item.whyItMatters),
    0
  );

  // If over 900 words, remove lowest-relevance items
  if (totalWords > 900 && items.length > 6) {
    items.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
    while (items.length > 6) {
      const currentWords = items.reduce((sum: number, item: any) =>
        sum + wordCount(item.title) + wordCount(item.summary) + wordCount(item.whyItMatters),
        0
      );
      if (currentWords <= 900) break;
      items.pop();
    }
    // Re-sort by position
    items.sort((a: any, b: any) => a.position - b.position);
    // Re-number positions
    items.forEach((item: any, i: number) => { item.position = i + 1; });
  }

  const openingText = raw.opening || '';
  const closingText = raw.closing || '';

  return {
    briefDate: today,
    totalWordCount: items.reduce((sum: number, item: any) =>
      sum + wordCount(item.title) + wordCount(item.summary) + wordCount(item.whyItMatters),
      0
    ) + wordCount(openingText) + wordCount(closingText),
    narrativeThread: raw.narrative_thread || '',
    opening: openingText,
    closing: closingText,
    items,
  };
}
