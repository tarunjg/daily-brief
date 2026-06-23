# Daily Company Brief – AI for Good

A daily brief built to fuel Forbes writing about how **good people and good teams use AI for good**.

Each morning it delivers:

1. **What you need to know in AI** — 3 sharp, high-signal bullets.
2. **People to meet** — 3 founders/leaders at companies doing inspiring, mission-driven AI work,
   each a potential Forbes profile, with the CEO/CPO to contact and their best-effort email.
3. **Draft intro email** — on request, a personalized outbound email to that CEO/CPO that
   introduces you and your endgame, shown on screen with a copy button.

Discovery is powered by **Claude + web search** (no RSS/embeddings on the hot path). Reflection
(text + voice) and Google Docs export are retained and now apply to the companies/people surfaced.

### How contact emails are found

For each person we (a) ask Claude for any **publicly listed** exec email + source, (b) infer the
most likely addresses from the company's email domain, and (c) run an **MX-record check** to
confirm the domain can receive mail and identify the provider. Each email is labelled
`verified` / `likely` / `fallback`. Mailbox-level SMTP verification is intentionally not used —
port 25 is blocked on serverless and Google Workspace accepts-all, so it's unreliable. An optional
third-party verification API can be wired behind an env flag later.

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
│   ├── research/
│   │   └── discover.ts        # Web-search brief + MX check + email inference
│   ├── pipeline/              # Orchestration (legacy RSS files retained, off-path)
│   │   ├── ingest.ts          # (legacy) RSS fetching + dedup
│   │   ├── orchestrate.ts     # Main pipeline coordinator
│   │   ├── ranking.ts         # (legacy) embedding-based ranking
│   │   └── sources.ts         # (legacy) RSS feed configuration
│   ├── prompts/
│   │   └── generate.ts        # Claude discovery (web search) + outbound email drafting
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

## Migration note

This release adds columns to `digest_items` (item type + person/contact fields) and a new
`outbound_emails` table. After pulling, apply the schema:

```bash
npm run db:push
```

## Requirements note

- **Web search must be enabled** for your `ANTHROPIC_API_KEY` (the `web_search` tool) — the brief
  is generated through it. If it isn't enabled, generation fails with a clear message.
- `OPENAI_API_KEY` is no longer required to generate a brief (RSS/embedding path is retired), though
  the legacy ranking files still reference it if you re-enable that path.

## Key Design Decisions

- **Two sections, fixed counts** — 3 AI bullets + 3 people to meet, every day
- **Contact confidence** — each email is `verified` / `likely` / `fallback`; domains are MX-checked
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
