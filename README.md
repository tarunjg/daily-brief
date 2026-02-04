# Daily Brief – Personal Daily Brief + Learning Log

A personalized daily news brief with integrated reflection (text + voice) and automatic Google Docs export.

## Architecture

```
src/
├── app/                       # Next.js App Router
│   ├── api/
│   │   ├── auth/[...nextauth] # Google OAuth (NextAuth)
│   │   ├── cron/generate/     # Daily brief cron endpoint
│   │   ├── export/            # Google Docs export
│   │   ├── generate-brief/    # Manual brief generation trigger
│   │   ├── notes/             # Reflection CRUD
│   │   ├── onboarding/        # Onboarding completion + resume parsing
│   │   ├── settings/          # Preference updates
│   │   └── voice/             # Audio upload + transcription
│   ├── auth/signin/           # Sign-in page
│   ├── brief/                 # Daily brief reading view
│   ├── onboarding/            # Onboarding wizard
│   └── settings/              # Settings page
├── components/
│   ├── brief/                 # Brief card components
│   ├── layout/                # Header, providers
│   ├── onboarding/            # Onboarding wizard
│   ├── reflection/            # Reflect modal (text + voice)
│   └── settings/              # Settings form
├── lib/
│   ├── db/                    # Drizzle schema + connection
│   ├── pipeline/              # Content ingestion, ranking, orchestration
│   │   ├── ingest.ts          # RSS fetching + dedup
│   │   ├── orchestrate.ts     # Main pipeline coordinator
│   │   ├── ranking.ts         # Embedding-based ranking
│   │   └── sources.ts         # RSS feed configuration
│   ├── prompts/
│   │   └── generate.ts        # Anthropic Claude prompting
│   ├── services/
│   │   ├── email.ts           # Resend email delivery
│   │   ├── google-docs.ts     # Google Docs API export
│   │   ├── storage.ts         # GCS audio storage
│   │   └── transcription.ts   # Deepgram transcription
│   └── utils/
│       └── index.ts           # Helpers (cn, encrypt, hash, etc.)
└── types/
    └── index.ts               # TypeScript interfaces
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in all values — see section below
```

### 3. Set up database

Create a [Supabase](https://supabase.com) project, then:

```bash
npm run db:push    # Push schema to database
```

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Enable these APIs:
   - Google Docs API
   - Google Drive API
5. Configure OAuth consent screen with these scopes:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/drive.file`

### 5. Set up services

- **Anthropic**: Get API key at [console.anthropic.com](https://console.anthropic.com)
- **OpenAI**: Get API key at [platform.openai.com](https://platform.openai.com) (for embeddings)
- **Deepgram**: Get API key at [deepgram.com](https://deepgram.com) (for transcription)
- **Resend**: Get API key at [resend.com](https://resend.com) (for email)
- **GCS**: Create a bucket and service account at [console.cloud.google.com](https://console.cloud.google.com)

### 6. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 7. Deploy

```bash
npx vercel
```

The `vercel.json` configures the cron job to run every hour at :30.

## Key Design Decisions

- **One Google Doc per user** — appended daily, never overwritten
- **Transcripts store both versions** — `original_transcript` (immutable) + `edited_transcript` (user-editable)
- **URL provenance** — every URL in the brief is verified against the input article list; hallucinated URLs are stripped
- **Topic diversity** — max 3 items per topic cluster enforced in ranking
- **Idempotent export** — re-exporting doesn't duplicate content

## Claude Code Handoff

This codebase is ready for local development. Priority items for Claude Code:

1. Wire API keys in `.env`
2. Run `npm run db:push` to create tables
3. Test the onboarding flow end-to-end
4. Test manual brief generation (`/api/generate-brief`)
5. Test voice recording on mobile (requires HTTPS — use `ngrok` or deploy)
6. Fine-tune the RSS source list in `src/lib/pipeline/sources.ts`
7. Adjust the LLM system prompt in `src/lib/prompts/generate.ts` based on output quality
