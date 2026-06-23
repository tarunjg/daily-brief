import Anthropic from '@anthropic-ai/sdk';
import type { UserProfilePayload, PersonItem, OutboundEmailDraft } from '@/types';
import { getRequiredEnv } from '@/lib/env';

const anthropic = new Anthropic({ apiKey: getRequiredEnv('ANTHROPIC_API_KEY') });

const MODEL = 'claude-sonnet-4-6';

// Tarun's public profiles — included in outbound intro emails so recipients can vet him.
export const TARUN_LINKEDIN = 'https://www.linkedin.com/in/tarun-galagali-b1a45a20/';
export const TARUN_FORBES = 'https://www.forbes.com/sites/tarungalagali/';

// ─── Who the brief is for (single-user app: Tarun) ───
const READER_PROFILE = [
  `=== WHO YOU'RE WRITING FOR ===`,
  `NAME: Tarun Galagali`,
  `ROLE: Head of Product on Lattice's AI team, and a Forbes contributor.`,
  `(He founded Mandala, an AI leadership coaching company, which was acquired by Lattice.)`,
  `LOCATION: Los Gatos, California`,
  ``,
  `THE ENDGAME (most important — this is what the brief serves):`,
  `Tarun writes Forbes pieces about how GOOD PEOPLE and GOOD TEAMS use AI for good —`,
  `for good causes and through good character. He is far more interested in the people`,
  `and teams behind the work than in the technology itself. The brief exists to (a) keep`,
  `him sharp on AI and (b) surface inspiring founders/leaders he should meet and`,
  `potentially profile, then help him reach out to them.`,
  ``,
  `COMPANY CONTEXT:`,
  `Tarun founded Mandala, an AI-powered leadership coaching platform native to Slack, combining`,
  `neuroscience-based leadership development (a "parasympathetic intelligence" thesis developed`,
  `with Dr. Michael Platt, Head of Neuroscience at Wharton) with AI. Mandala was ACQUIRED BY`,
  `LATTICE, where Tarun now leads the AI product team — so he is always scouting founders and`,
  `teams using AI for good, both to profile them and to stay connected. He is co-authoring`,
  `"PAUSE: Leading with Parasympathetic Intelligence" (Basic Books, 2027).`,
  ``,
  `CAREER BACKGROUND (for credibility in outreach):`,
  `  - Harvard Business School MBA (2022)`,
  `  - Head of Product Marketing & Strategy at Verily (Alphabet's life sciences company)`,
  `  - Product roles at Google; Talkspace (through their IPO); Parthenon-EY (strategy)`,
  `  - English Literature undergrad (a writer at heart)`,
  ``,
  `WHAT "GOOD" MEANS TO HIM:`,
  `  - AI applied to genuine social impact: health, education, climate, accessibility,`,
  `    mental health, democracy, opportunity, scientific progress.`,
  `  - Founders and teams of strong character — mission-driven, humane, doing right by`,
  `    their people and users, not just chasing hype or valuation.`,
  `  - Real, shipped work over vaporware. Substance over spin.`,
].join('\n');

// ═══════════════════════════════════════════════════════════════════
//  PART 1 — Daily discovery (web search)
// ═══════════════════════════════════════════════════════════════════

const DISCOVERY_SYSTEM_PROMPT = `You are Tarun's research analyst and scout. Every day you do two jobs:

1. Brief him on what he needs to know in AI — 3 sharp, high-signal bullets.
2. Find 3 people he should meet — founders or leaders at companies doing inspiring things
   with AI FOR GOOD. These are potential subjects for his Forbes column about good people
   and good teams using AI for good.

You have a web_search tool. USE IT to ground everything in real, recent, verifiable facts.
Search for current AI developments and for companies/founders doing genuinely inspiring,
mission-driven AI work. Prefer the last ~30 days; never fabricate.

Your voice: clear, warm, and substantive. Punchy but never dumb. No corporate buzzwords
("synergy", "leverage", "ecosystem"). Respect the reader's intelligence.

WHAT MAKES A GREAT "PERSON TO MEET":
- The company uses AI for real social good (health, education, climate, accessibility,
  mental health, science, opportunity, democracy) OR the team is a model of good character.
- There is a specific, nameable human — ideally a founder/CEO/CPO — worth profiling.
- It's a story Tarun could credibly pitch to Forbes: a good person/team, doing good, with AI.

COMMERCIAL BAR & STAGE MIX — HARD FILTERS:
Tarun wants to discover rising stars EARLY and elevate them — vetted founders on a clear
unicorn trajectory, caught before they're household names.
- STAGE MIX: aim for ~80% SEED or SERIES A companies; the remaining ~20% may be Series B, C,
  or D. HARD CAP: nothing later than Series D. Do NOT surface late-stage, pre-IPO, public, or
  mega-cap companies (no OpenAI/Anthropic/Databricks-tier giants).
- Even at Seed/Series A, the founder must be clearly VETTED and the business model must
  plausibly SCALE to a $1B+ outcome — strong team, real early traction, a structural advantage,
  credible investors. Promise AND proof, not just good intentions.
GOOD EXAMPLE: Grow Therapy — a scalable, insurance-enabled model in mental health.
AVOID on one side: admirable-but-unproven tiny apps, grant-dependent nonprofits, narrow point
tools. AVOID on the other side: already-huge late-stage/public giants. The sweet spot is the
inspiring Seed/Series A founder on their way up.
- Avoid the obvious giants unless there's a genuinely fresh, human angle. Favor founders he
  could actually reach and who'd benefit from his platform.

FOR EACH PERSON, you must identify:
- The person to meet and their role.
- The company, a one-line description, and WHY Tarun should meet them (the Forbes angle).
- The CEO or CPO to contact (name + role) — the person he'd email to start the conversation.
- The company's primary email DOMAIN (e.g. "anthropic.com"), found via search. Bare domain only.
- Any PUBLICLY LISTED email for that CEO/CPO, with the source URL where you saw it. Only include
  an email if you genuinely found it published somewhere; otherwise null. Never invent an address.
- A best-guess LinkedIn URL for the CEO/CPO (or the person), or null.
- 1-3 source links (real URLs from your searches) supporting the story.

CRITICAL OUTPUT RULES:
- Do your searching and thinking, then end your turn with EXACTLY ONE JSON object,
  wrapped in a \`\`\`json fenced code block. No commentary after it.
- Every URL must be a real URL you actually encountered via search. Never guess URLs.
- Exactly 3 ai_news items and exactly 3 people.

JSON schema:
\`\`\`json
{
  "brief_date": "YYYY-MM-DD",
  "narrative_thread": "<1 sentence on today's throughline>",
  "ai_news": [
    {
      "title": "<clear, punchy headline>",
      "summary": "<2-3 sentences, factual with personality>",
      "why_it_matters": "<1-2 sentences tying to Tarun's work/Forbes/Mandala>",
      "topics": ["<topic>", "<topic>"],
      "source_links": [ { "url": "<real url>", "label": "<source name>" } ]
    }
  ],
  "people": [
    {
      "person_name": "<the inspiring person>",
      "person_role": "<their role/title>",
      "company_name": "<company>",
      "company_one_liner": "<what they do, one line>",
      "why_meet": "<2-3 sentences: the Forbes-worthy good-people/good-AI angle>",
      "ceo_cpo_name": "<CEO or CPO to contact>",
      "ceo_cpo_role": "<CEO | CPO | Co-founder & CEO | etc>",
      "company_domain": "<bare email domain or null>",
      "found_email": "<publicly listed exec email or null>",
      "found_email_source": "<url where found or null>",
      "linkedin_url": "<best-guess LinkedIn url or null>",
      "source_links": [ { "url": "<real url>", "label": "<source name>" } ]
    }
  ]
}
\`\`\``;

export interface RawBriefPerson {
  person_name: string;
  person_role: string;
  company_name: string;
  company_one_liner: string;
  why_meet: string;
  ceo_cpo_name: string;
  ceo_cpo_role: string;
  company_domain: string | null;
  found_email: string | null;
  found_email_source: string | null;
  linkedin_url: string | null;
  source_links: { url: string; label: string }[];
}

export interface RawBrief {
  brief_date: string;
  narrative_thread: string;
  ai_news: {
    title: string;
    summary: string;
    why_it_matters: string;
    topics: string[];
    source_links: { url: string; label: string }[];
  }[];
  people: RawBriefPerson[];
}

function buildDiscoveryPrompt(profile: UserProfilePayload, today: string): string {
  const interests = profile.interests.length ? profile.interests.join(', ') : 'AI, leadership, social impact';
  const goals = profile.goals.length ? profile.goals.map((g, i) => `  ${i + 1}. ${g}`).join('\n') : '  (none specified)';

  return `${READER_PROFILE}

INTERESTS: ${interests}

STATED GOALS:
${goals}

Today's date: ${today}

Produce today's brief now. Search the web first to ground everything in real, recent facts,
then return the single JSON object per your instructions:
- 3 "ai_news" bullets: what Tarun needs to know in AI today.
- 3 "people" to meet: inspiring founders/teams using AI for good, each a potential Forbes profile.
Remember: he cares most about GOOD PEOPLE and GOOD TEAMS — but apply the COMMERCIAL BAR &
STAGE MIX strictly. Lean ~80% Seed/Series A (cap at Series D, no giants); catch vetted
founders on a clear unicorn trajectory EARLY (think Grow Therapy, not an unproven wellness
app and not a late-stage household name). Quality over feel-good.`;
}

/** Extract the last JSON object from a model response (handles ```json fences). */
function extractJson(text: string): string {
  const fenceMatch = Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g));
  if (fenceMatch.length > 0) {
    return fenceMatch[fenceMatch.length - 1][1].trim();
  }
  // Fallback: slice from first '{' to last '}'
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    return text.slice(first, last + 1).trim();
  }
  return text.trim();
}

/**
 * Run the daily discovery via Claude + web search.
 * Returns the raw, un-enriched brief (email/MX enrichment happens in research/discover.ts).
 */
export async function runDiscovery(
  profile: UserProfilePayload,
  today: string,
): Promise<RawBrief> {
  const userPrompt = buildDiscoveryPrompt(profile, today);

  // web_search is a server tool; SDK types in this version don't model it, so cast.
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }] as any;

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }];
  let allText = '';

  // Handle pause_turn (long server-tool runs) by continuing up to a few times.
  for (let turn = 0; turn < 4; turn++) {
    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: DISCOVERY_SYSTEM_PROMPT,
        messages,
        tools,
      });
    } catch (error: any) {
      const msg = String(error?.message || error);
      if (/web_search|tool.*not.*(enabled|available|supported)|invalid.*tool/i.test(msg)) {
        throw new Error(
          'Web search is not enabled for this Anthropic API key. Enable the web_search tool ' +
          'in the Anthropic console to generate the company brief.',
        );
      }
      throw error;
    }

    for (const block of response.content) {
      if (block.type === 'text') allText += block.text + '\n';
    }

    if ((response.stop_reason as string) === 'pause_turn') {
      // Feed assistant content back to continue the turn.
      messages.push({ role: 'assistant', content: response.content as any });
      continue;
    }
    break;
  }

  const jsonStr = extractJson(allText);
  let parsed: RawBrief;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    console.error('[Discovery] Invalid JSON:', jsonStr.slice(0, 800));
    throw new Error(`Discovery returned invalid JSON: ${error}`);
  }
  return parsed;
}

// ═══════════════════════════════════════════════════════════════════
//  PART 2 — Outbound intro email draft
// ═══════════════════════════════════════════════════════════════════

const EMAIL_SYSTEM_PROMPT = `You draft warm, sincere outbound intro emails on Tarun's behalf — emails that sound like HIM, not a template.

These go to the CEO/CPO of a company doing inspiring AI-for-good work. Goal: a genuine human
connection that could become a Forbes profile of their good work and good team.

STRUCTURE — follow this flow:
1. Greeting by first name only ("Munjal,").
2. Who Tarun is, woven naturally, with TWO INLINE hyperlinks (markdown links with readable anchor
   text — NEVER a list of raw URLs at the bottom):
   - "[Forbes contributor](${TARUN_FORBES})"
   - an invitation to connect on "[LinkedIn](${TARUN_LINKEDIN})"
   Include the Mandala→Lattice line (founded Mandala, an AI leadership coaching company, acquired
   by Lattice, where he now leads the AI product team) and a brief background (Verily, Google, HBS MBA).
3. Why he's reaching out: he's always on the lookout for founders/builders using AI for good —
   to profile them for Forbes, and honestly to stay connected.
4. Specific, genuine admiration of THEIR work — cite one concrete, true detail from the context.
   Sincere and a little informal ("found it pretty inspiring that…", "very cool that…").
5. The ask: a short conversation — 30 minutes. Offer to share the draft of the piece before it
   goes live. Frame the goal as a profile centered on THEM and their team, not the technology.
6. Close warm: a line like "Main goal is to connect and elevate stories like yours. :)" then
   "Warmly," and "Tarun Galagali". NO title block, NO bare URLs at the bottom.

VOICE:
- Warm, human, sincere, lightly informal. A single ":)" near the end is welcome.
- ~160-200 words. No "I hope this email finds you well", no buzzwords, no stiff "Warm regards".
- Hyperlinks must be INLINE markdown links inside the sentences, never appended as raw URLs.

GOLD EXAMPLE — match this tone, structure, and link style; adapt the specifics to the recipient:
---
Munjal,

I'm a [Forbes contributor](${TARUN_FORBES}) — my column focuses on the people and teams using AI for genuinely good ends — and in my day job the founder of Mandala, an AI leadership coaching company that was acquired by Lattice, where I now lead the AI product team. Before that: product and strategy at Verily and Google, and an MBA at HBS. Here's my [LinkedIn](${TARUN_LINKEDIN}) if you'd like to connect.

I'm always on the lookout for founders and builders using AI for good — to profile them for Forbes, and honestly to stay connected. I read about what you've been building at Hippocratic AI and found it pretty inspiring that you've made safety THE foundation, not an afterthought. Very cool that you've reached 115M+ patient interactions across six countries with no reported safety incidents.

I'd love a short conversation — 30 minutes — to hear how you think about the 'do no harm' architecture from the inside. The goal would be a Forbes profile centered on you and your team, not the technology, and I'd happily share the draft before it goes live. Main goal is to connect and elevate stories like yours. :)

Warmly,
Tarun Galagali
---

Return ONLY a JSON object, no fences, no commentary:
{ "subject": "<subject line>", "body": "<email body as plain text with \\n line breaks; include the two inline markdown hyperlinks; NO bottom signature block of raw URLs>" }`;

/** Draft a personalized outbound intro email to a person's CEO/CPO. */
export async function draftOutboundEmail(
  person: PersonItem,
  toEmail: string | null,
): Promise<OutboundEmailDraft> {
  const context = [
    `RECIPIENT: ${person.ceoCpoName} (${person.ceoCpoRole}) at ${person.companyName}.`,
    toEmail ? `RECIPIENT EMAIL: ${toEmail}` : `RECIPIENT EMAIL: (unknown — write greeting to them by name)`,
    `COMPANY: ${person.companyName} — ${person.companyOneLiner}`,
    `THE INSPIRING ANGLE / WHY TARUN WANTS TO MEET THEM: ${person.whyMeet}`,
    person.personName && person.personName !== person.ceoCpoName
      ? `NOTE: The person who first caught Tarun's eye is ${person.personName} (${person.personRole}).`
      : '',
    `SOURCES Tarun read: ${person.sourceLinks.map(l => l.label).join(', ')}`,
  ].filter(Boolean).join('\n');

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: EMAIL_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `${READER_PROFILE}\n\nDraft the outbound intro email.\n\n${context}`,
    }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from email draft');

  let raw = textBlock.text.trim();
  if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first !== -1 && last > first) raw = raw.slice(first, last + 1);

  let parsed: { subject: string; body: string };
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('[Email] Invalid JSON:', raw.slice(0, 500));
    throw new Error(`Email draft returned invalid JSON: ${error}`);
  }

  return { toEmail, subject: parsed.subject || '', body: parsed.body || '' };
}
