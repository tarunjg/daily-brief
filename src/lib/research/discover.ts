import { promises as dns } from 'dns';
import type {
  UserProfilePayload,
  GeneratedBrief,
  AiNewsItem,
  PersonItem,
  CandidateEmail,
} from '@/types';
import { runDiscovery, type RawBriefPerson } from '@/lib/prompts/generate';

export interface DomainCheck {
  mailable: boolean;
  provider: string | null;
}

/**
 * Validate that a domain can receive mail (has MX records) and identify the provider.
 * This is the realistic "domain checker": it confirms the domain is mailable and catches
 * wrong-domain guesses. It does NOT verify individual mailboxes (impossible on serverless:
 * port 25 is blocked, and Google Workspace accepts-all at RCPT).
 */
export async function verifyDomainMx(domain: string | null): Promise<DomainCheck> {
  if (!domain) return { mailable: false, provider: null };
  const clean = normalizeDomain(domain);
  try {
    const mx = await dns.resolveMx(clean);
    if (!mx.length) return { mailable: false, provider: null };
    mx.sort((a, b) => a.priority - b.priority);
    return { mailable: true, provider: providerFromMx(mx[0].exchange) };
  } catch {
    return { mailable: false, provider: null };
  }
}

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/^.*@/, '');
}

function providerFromMx(exchange: string): string {
  const top = exchange.toLowerCase();
  if (top.includes('google') || top.includes('googlemail')) return 'Google Workspace';
  if (top.includes('outlook') || top.includes('microsoft') || top.includes('protection.outlook')) return 'Microsoft 365';
  if (top.includes('zoho')) return 'Zoho';
  if (top.includes('proofpoint') || top.includes('pphosted')) return 'Proofpoint';
  if (top.includes('mimecast')) return 'Mimecast';
  // Fall back to the registrable-ish domain of the MX host.
  const parts = top.replace(/\.$/, '').split('.');
  return parts.slice(-2).join('.');
}

/** Generate ranked candidate email patterns for a person at a domain. */
export function inferEmails(fullName: string, domain: string): string[] {
  const clean = normalizeDomain(domain);
  const parts = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0 || !clean) return [];

  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : '';

  const patterns: string[] = [];
  if (last) {
    patterns.push(
      `${first}@${clean}`,
      `${first}.${last}@${clean}`,
      `${first[0]}${last}@${clean}`,
      `${first}${last[0]}@${clean}`,
      `${first}_${last}@${clean}`,
    );
  } else {
    patterns.push(`${first}@${clean}`);
  }
  return Array.from(new Set(patterns));
}

/** Build the ranked candidate-email list for a person, with confidence labels. */
function buildCandidateEmails(person: RawBriefPerson, domainMailable: boolean): CandidateEmail[] {
  const out: CandidateEmail[] = [];
  const seen = new Set<string>();

  const push = (email: string, confidence: CandidateEmail['confidence'], source?: string) => {
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ email, confidence, ...(source ? { source } : {}) });
  };

  // 1. Publicly found email (verified) — trust regardless of MX.
  if (person.found_email && /\S+@\S+\.\S+/.test(person.found_email)) {
    push(person.found_email.trim(), 'verified', person.found_email_source || undefined);
  }

  const domain = person.company_domain ? normalizeDomain(person.company_domain) : null;
  if (domain) {
    // 2. Pattern guesses for the CEO/CPO — "likely" only if the domain is mailable.
    const guesses = inferEmails(person.ceo_cpo_name, domain).slice(0, 3);
    for (const g of guesses) push(g, domainMailable ? 'likely' : 'fallback');

    // 3. General inboxes as fallback.
    push(`press@${domain}`, 'fallback');
    push(`hello@${domain}`, 'fallback');
  }

  return out;
}

/**
 * Generate today's company brief: 3 AI news bullets + 3 people to meet,
 * with each person's contact enriched via MX validation and email inference.
 */
export async function generateCompanyBrief(
  profile: UserProfilePayload,
  today: string,
): Promise<GeneratedBrief> {
  const raw = await runDiscovery(profile, today);

  const aiNews: AiNewsItem[] = (raw.ai_news || []).slice(0, 3).map((n, i) => ({
    position: i + 1,
    title: n.title || 'Untitled',
    summary: n.summary || '',
    whyItMatters: n.why_it_matters || '',
    topics: n.topics || [],
    sourceLinks: (n.source_links || []).filter((l) => l?.url),
  }));

  const people: PersonItem[] = [];
  const rawPeople = (raw.people || []).slice(0, 3);
  for (let i = 0; i < rawPeople.length; i++) {
    const p = rawPeople[i];
    const domain = p.company_domain ? normalizeDomain(p.company_domain) : null;
    const check = await verifyDomainMx(domain);
    people.push({
      position: i + 1,
      personName: p.person_name || '',
      personRole: p.person_role || '',
      companyName: p.company_name || '',
      companyOneLiner: p.company_one_liner || '',
      whyMeet: p.why_meet || '',
      ceoCpoName: p.ceo_cpo_name || '',
      ceoCpoRole: p.ceo_cpo_role || '',
      companyDomain: domain,
      domainMailable: check.mailable,
      mailProvider: check.provider,
      candidateEmails: buildCandidateEmails(p, check.mailable),
      linkedinUrl: p.linkedin_url || null,
      sourceLinks: (p.source_links || []).filter(l => l?.url),
    });
  }

  return {
    briefDate: raw.brief_date || today,
    narrativeThread: raw.narrative_thread || '',
    aiNews,
    people,
  };
}

/** The single best email to suggest as the outbound recipient (or null). */
export function bestEmail(candidates: CandidateEmail[]): string | null {
  if (!candidates.length) return null;
  const order = { verified: 0, likely: 1, fallback: 2 } as const;
  return [...candidates].sort((a, b) => order[a.confidence] - order[b.confidence])[0].email;
}
