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

// ─── Newsletter / Digest ───

export type DigestStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface DigestItem {
  position: number;
  title: string;
  summary: string;
  whyItMatters: string;
  relevanceScore: number;
  topics: string[];
  sourceLinks: SourceLink[];
}

export interface SourceLink {
  url: string;
  label: string;
}

export interface GeneratedBrief {
  briefDate: string;
  totalWordCount: number;
  items: DigestItem[];
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
  items: DigestItem[];
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
