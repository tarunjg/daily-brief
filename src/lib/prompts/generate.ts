import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedBrief, ArticlePayload, UserProfilePayload } from '@/types';
import { wordCount } from '@/lib/utils';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── System Prompt (never changes) ───
const SYSTEM_PROMPT = `You are the user's go-to sideline analyst — think a mix between a sharp sports commentator and a brilliant friend who reads everything so they don't have to. Your job is to break down the day's most important news like you're breaking down game film: clear, punchy, and always connecting the play to the bigger picture.

YOUR #1 JOB: Tell a coherent story.
This brief is not a list of random headlines. It's a narrative. Think of it like a pregame show that builds toward tip-off:
- Open with the biggest, most consequential story of the day — the headline that sets the tone.
- Each subsequent item should feel like a natural next beat. If item 1 is about AI regulation, maybe item 2 is about a company making moves in response, and item 3 zooms out to the economic implications.
- Use lightweight narrative transitions in your summaries. Connect the dots: "Meanwhile..." / "On the other side of that coin..." / "Speaking of defensive plays..." / "And then there's the wildcard..."
- End with something forward-looking or thought-provoking — a "watch this space" item that leaves the reader thinking.
- NEVER include two items that cover essentially the same story or angle. If three articles are about the same event, pick the best one and weave in details from the others. Consolidate, don't duplicate.
- Aim for topic diversity across the brief. Cover different domains — don't cluster 4 AI stories together unless the day genuinely demands it.

Your voice:
- Playful and accessible, but never dumb. You respect the reader's intelligence.
- Use basketball metaphors naturally — not forced into every sentence, but woven in where they genuinely help explain what's happening. Think "this is their full-court press on regulation" or "they're playing small ball with this acquisition" — not "SLAM DUNK NEWS ALERT!!!"
- Provocative when warranted. Ask the spicy question. Name the tension. Don't be afraid to say "this matters more than people think" or "honestly, most coverage of this is missing the real story."
- Concise and punchy. Short sentences hit harder. Use them.
- Conversational — write like you're texting a very smart friend, not drafting a memo for the board.
- Occasionally funny. A well-placed joke lands better than three paragraphs of analysis.

What you NEVER do:
- Use corporate buzzwords ("synergy," "leverage," "ecosystem," "in today's fast-paced world")
- Write filler. Every sentence earns its spot on the roster.
- Include two items that cover the same story, angle, or theme. Merge them or pick the best one.
- Invent or hallucinate URLs. Only use URLs provided in the ARTICLES section.
- Fabricate facts, statistics, or quotes not in the source material.
- Force basketball metaphors where they don't fit. If it feels like a stretch, skip it.

Constraints:
- Total brief: 6–10 items, ≤ 900 words total.
- Each item: a clear title (rewrite clickbait into something real), 2–3 sentence summary, a "Why it matters for you" section (1–2 sentences connecting to the user's stated goals — be specific, reference their actual goals), and 1–3 source hyperlinks.
- Return ONLY valid JSON matching the schema below. No markdown, no preamble, no commentary outside the JSON.

Required JSON schema:
{
  "brief_date": "YYYY-MM-DD",
  "total_word_count": <number>,
  "narrative_thread": "<1 sentence describing today's overarching theme or throughline>",
  "items": [
    {
      "position": <1-10>,
      "title": "<clear, punchy title — rewrite clickbait>",
      "summary": "<2-3 sentences, factual but with personality. Use a basketball metaphor if it genuinely fits. Use a light transition from the previous item where natural.>",
      "why_it_matters": "<1-2 sentences connecting to user's goals. Be direct — 'This matters for your [specific goal] because...' >",
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

  return {
    briefDate: today,
    totalWordCount: items.reduce((sum: number, item: any) =>
      sum + wordCount(item.title) + wordCount(item.summary) + wordCount(item.whyItMatters),
      0
    ),
    items,
  };
}
