// ─── User & Preferences ───

export type Seniority = 'IC' | 'Manager' | 'Director' | 'VP' | 'C-Suite' | 'Founder';

export interface UserPreferences {
  interests: string[];
  goals: GoalEntry[];
  roleTitle: string;
  seniority: Seniority;
  industries: string[];
  geography: string;
  timezone: string;
  linkedinText?: string;
  resumeText?: string;
}

export interface GoalEntry {
  text: string;
  priority: number;
}

// ─── Content Pipeline ───

export interface RawArticle {
  sourceUrl: string;
  title: string;
  rawContent: string;
  sourceName: string;
  publishedAt: Date;
  topics: string[];
  contentHash: string;
}

export interface RankedArticle extends RawArticle {
  relevanceScore: number;
  embedding?: number[];
}

// ─── Company Brief / Digest ───

export type DigestStatus = 'pending' | 'generating' | 'ready' | 'failed';

export type ItemType = 'ai_news' | 'person';

export type EmailConfidence = 'verified' | 'likely' | 'fallback';

export interface CandidateEmail {
  email: string;
  confidence: EmailConfidence;
  source?: string; // URL when verified (publicly listed)
}

export interface SourceLink {
  url: string;
  label: string;
}

/** One of the three "what you need to know in AI" bullets. */
export interface AiNewsItem {
  position: number;
  title: string;
  summary: string;
  whyItMatters: string;
  topics: string[];
  sourceLinks: SourceLink[];
}

/** One of the three "people to meet" cards. */
export interface PersonItem {
  position: number;
  personName: string;
  personRole: string;
  companyName: string;
  companyOneLiner: string;
  whyMeet: string;
  ceoCpoName: string;
  ceoCpoRole: string;
  companyDomain: string | null;
  domainMailable: boolean;
  mailProvider: string | null;
  candidateEmails: CandidateEmail[];
  linkedinUrl: string | null;
  sourceLinks: SourceLink[];
}

/** Unified storage shape (one row per digest item). */
export interface DigestItem {
  itemType: ItemType;
  position: number;
  title: string;
  summary: string;
  whyItMatters: string;
  relevanceScore: number;
  topics: string[];
  sourceLinks: SourceLink[];
  // Person-only fields (undefined for ai_news)
  personName?: string;
  personRole?: string;
  companyName?: string;
  companyOneLiner?: string;
  whyMeet?: string;
  ceoCpoName?: string;
  ceoCpoRole?: string;
  companyDomain?: string | null;
  domainMailable?: boolean;
  mailProvider?: string | null;
  candidateEmails?: CandidateEmail[];
  linkedinUrl?: string | null;
}

export interface GeneratedBrief {
  briefDate: string;
  narrativeThread: string;
  aiNews: AiNewsItem[];
  people: PersonItem[];
}

export interface OutboundEmailDraft {
  toEmail: string | null;
  subject: string;
  body: string;
}

// ─── Reflections ───

export type NoteType = 'text' | 'voice';
export type TranscriptionStatus = 'pending' | 'completed' | 'failed';

export interface Reflection {
  id: string;
  digestItemId: string;
  noteType: NoteType;
  textContent: string;
  createdAt: Date;
}

export interface VoiceNote {
  noteId: string;
  audioUrl: string;
  audioDurationSeconds: number;
  audioFormat: string;
  originalTranscript: string;
  editedTranscript: string | null;
  transcriptionStatus: TranscriptionStatus;
  transcriptionConfidence: number;
}

// ─── Email ───

export interface BriefEmailData {
  userName: string;
  briefDate: string;
  aiNews: AiNewsItem[];
  people: PersonItem[];
  appUrl: string;
}

// ─── LLM Prompting ───

export interface ArticlePayload {
  index: number;
  title: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  content: string;
}

export interface UserProfilePayload {
  interests: string[];
  goals: string[];
  roleTitle: string;
  seniority: string;
  industries: string[];
  geography: string;
  professionalBackground: string;
}

// ─── Google Doc Export ───

export interface DocExportEntry {
  date: string;
  items: {
    title: string;
    sourceUrl: string;
    summary: string;
    reflection: string;
    audioUrl?: string;
  }[];
}

// ─── API Responses ───

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Onboarding ───

export interface OnboardingData {
  step: number;
  interests: string[];
  goals: GoalEntry[];
  roleTitle: string;
  seniority: Seniority;
  industries: string[];
  geography: string;
  timezone: string;
  linkedinText: string;
  resumeFile: File | null;
}

// ─── RSS Sources ───

export interface RSSSource {
  name: string;
  url: string;
  category: string;
  tier: number;
}
