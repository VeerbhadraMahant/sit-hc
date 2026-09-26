# Pulse — AI-Powered Employee Feedback & Insights

Employees share feedback by **text, voice note, or a photo of a handwritten note**. Pulse transcribes it, translates it, redacts personal details, and analyzes it with Gemini. HR gets a dashboard of **themes, sentiment, risks, and prioritized actions**, and can ask questions of all feedback in plain English.

## Features

**For employees**
- Anonymous by default. When anonymous, no name or email is stored, personal details are redacted by AI, and the original wording is deleted once analysis succeeds.
- Voice notes are transcribed in memory. Audio is never stored. Works in 40+ languages.
- Scan a note: OCR for handwritten notes, suggestion slips, and paper forms (images or PDF).
- A tracking code lets employees follow status and read HR's "You said, we did" response.

**For HR**
- Overview: KPIs, weekly sentiment trend, top themes, department × sentiment heatmap, risk radar, channel mix, and emotions.
- A Needs Attention queue. Critical items (harassment, safety, discrimination, and similar) trigger an **email alert**.
- A feedback inbox with filters, status workflow, responses (emailed to identified employees), internal case notes, and CSV export.
- AI insight reports: executive summary, top concerns with evidence, bright spots, and P1–P3 action items. Reports can be exported to PDF or emailed to leadership.
- Ask AI: RAG chat over all feedback (pgvector) with citations.
- Bulk import of scanned survey forms or suggestion-box slips via OCR, or pasted CSV.

## Architecture

```
Next.js 15 (App Router, TS, Tailwind v4) ── Route handlers (server-only)
   │                                            │
   │  employee: /submit /track                  ├─ Gemini: transcribe · OCR · analyze · insights · Q&A
   │  HR:       /dashboard/*  (Supabase Auth)   ├─ Gemini embeddings (768-d) → pgvector
   │                                            ├─ Resend: alerts, confirmations, responses
   ▼                                            ▼
Supabase Postgres (RLS: HR-only reads via is_hr(); employees only through API)
```

AI pipeline for each submission: `transcribe | OCR` → `analyze` (a structured JSON schema covering translation, PII redaction, sentiment, emotions, themes from a fixed taxonomy, urgency, risk flags, and suggested action) → `embed` → store → alert if critical. Model calls retry with backoff and fall back through several Gemini models when one is overloaded.

## Getting started

```bash
cp .env.example .env.local        # fill in keys (see comments in the file)
npm install
npm run db -- --file supabase/migrations/0001_init.sql   # or paste into the Supabase SQL editor
npm run create-hr                 # creates the HR admin from HR_ADMIN_* vars
npm run seed -- --reset           # ~130 realistic demo feedback items + embeddings
npm run dev                       # http://localhost:3000
```

| Route | Who |
|---|---|
| `/` | Landing page |
| `/submit` | Employee feedback (write / voice / scan) |
| `/track` | Employee status lookup |
| `/login` | HR sign-in (email + password or Google) |
| `/dashboard` | HR console |

### Auth and email setup
- **Google sign-in**: add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI on the Google OAuth client. Google users need a row in `hr_profiles` before they get HR access.
- **Email**: Supabase Auth SMTP is set to Resend (`smtp.resend.com:465`, user `resend`). Until you verify a domain in Resend, mail can only be sent from `onboarding@resend.dev` to the Resend account owner's address. Verify a domain and set `EMAIL_FROM` for real use.

## Design

The UI follows a blueprint-style design system adapted from Buddy.works on Refero. See [docs/DESIGN.md](docs/DESIGN.md).

## Scripts

`npm run dev | build | lint | typecheck | test | seed | db | create-hr`
