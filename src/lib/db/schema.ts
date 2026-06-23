import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  real,
  date,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Users ───
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  image: text('image'),
  googleAccessToken: text('google_access_token'),   // encrypted at app layer
  googleRefreshToken: text('google_refresh_token'),  // encrypted at app layer
  timezone: varchar('timezone', { length: 50 }).default('America/New_York'),
  googleDocId: varchar('google_doc_id', { length: 255 }),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  lastExportAt: timestamp('last_export_at'),
  voiceConsentGiven: boolean('voice_consent_given').default(false),
  emailBriefEnabled: boolean('email_brief_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── User Preferences ───
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  interests: text('interests').array().default([]),
  goals: jsonb('goals').default([]),  // GoalEntry[]
  roleTitle: varchar('role_title', { length: 255 }),
  seniority: varchar('seniority', { length: 50 }),
  industries: text('industries').array().default([]),
  geography: varchar('geography', { length: 100 }),
  linkedinText: text('linkedin_text'),
  resumeText: text('resume_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Articles (source content, pre-summarization) ───
export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceUrl: text('source_url').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  rawContent: text('raw_content'),
  sourceName: varchar('source_name', { length: 255 }),
  publishedAt: timestamp('published_at'),
  topics: text('topics').array().default([]),
  contentHash: varchar('content_hash', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sourceUrlIdx: uniqueIndex('articles_source_url_idx').on(table.sourceUrl),
  contentHashIdx: uniqueIndex('articles_content_hash_idx').on(table.contentHash),
}));

// ─── Digests (one per user per day) ───
export const digests = pgTable('digests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  digestDate: date('digest_date').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  totalWordCount: integer('total_word_count'),
  generatedAt: timestamp('generated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Digest Items (individual brief entries: AI news bullets OR people to meet) ───
export const digestItems = pgTable('digest_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  digestId: uuid('digest_id').references(() => digests.id, { onDelete: 'cascade' }).notNull(),
  // Nullable: web-search items (AI news / people) are not backed by an ingested article row.
  articleId: uuid('article_id').references(() => articles.id),
  itemType: varchar('item_type', { length: 20 }).default('ai_news').notNull(), // 'ai_news' | 'person'
  position: integer('position').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  summary: text('summary').notNull(),
  whyItMatters: text('why_it_matters').notNull(),
  relevanceScore: real('relevance_score'),
  topics: text('topics').array().default([]),
  sourceLinks: jsonb('source_links').default([]),  // SourceLink[]

  // ── Person ("people to meet") fields — null for ai_news items ──
  personName: varchar('person_name', { length: 255 }),
  personRole: varchar('person_role', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  companyOneLiner: text('company_one_liner'),
  ceoCpoName: varchar('ceo_cpo_name', { length: 255 }),
  ceoCpoRole: varchar('ceo_cpo_role', { length: 100 }),
  companyDomain: varchar('company_domain', { length: 255 }),
  domainMailable: boolean('domain_mailable'),
  mailProvider: varchar('mail_provider', { length: 100 }),
  candidateEmails: jsonb('candidate_emails').default([]), // CandidateEmail[]
  linkedinUrl: text('linkedin_url'),
  whyMeet: text('why_meet'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Outbound Emails (drafted intros to a person's CEO/CPO) ───
export const outboundEmails = pgTable('outbound_emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  digestItemId: uuid('digest_item_id').references(() => digestItems.id, { onDelete: 'cascade' }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  toEmail: varchar('to_email', { length: 320 }),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Notes (user reflections, text or voice) ───
export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  digestItemId: uuid('digest_item_id').references(() => digestItems.id, { onDelete: 'cascade' }).notNull(),
  noteType: varchar('note_type', { length: 10 }).notNull(), // 'text' | 'voice'
  textContent: text('text_content'), // typed note OR final (edited) transcript
  exportedToDoc: boolean('exported_to_doc').default(false),
  exportedAt: timestamp('exported_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Voice Notes (1:1 with notes where noteType = 'voice') ───
export const voiceNotes = pgTable('voice_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  noteId: uuid('note_id').references(() => notes.id, { onDelete: 'cascade' }).notNull().unique(),
  audioUrl: text('audio_url'),
  audioDurationSeconds: integer('audio_duration_seconds'),
  audioFormat: varchar('audio_format', { length: 20 }),
  originalTranscript: text('original_transcript'),
  editedTranscript: text('edited_transcript'),
  transcriptionStatus: varchar('transcription_status', { length: 20 }).default('pending'),
  transcriptionConfidence: real('transcription_confidence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Doc Exports (audit log) ───
export const docExports = pgTable('doc_exports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  exportDate: date('export_date').notNull(),
  notesExported: integer('notes_exported').default(0),
  status: varchar('status', { length: 20 }).default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── NextAuth required tables ───
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: varchar('token_type', { length: 255 }),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires').notNull(),
});
