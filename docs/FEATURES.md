# Vocalyze — full feature inventory

A complete list of everything currently built in the app: every page, every API route,
every AI capability, every visualization, and the security model behind them. For the
pitch-style summary see the root `README.md`; this document is the exhaustive reference.

---

## 1. Product in one paragraph

Vocalyze is an AI-powered employee feedback platform with two front ends — a public/
employee side and an HR side — built on Next.js 15 (App Router), Supabase (Postgres +
pgvector + Auth), and Google Gemini. Employees give feedback anonymously or by name,
through text, voice, or a photo of a paper form, in any language. Gemini analyses every
submission in the background (sentiment, urgency, themes, risk flags, a redacted
summary) and HR gets a dashboard with triage, AI-generated leadership briefings, a
RAG-based "Ask AI" search, pulse surveys, and a closed-loop system that proves feedback
led to action — all while making it structurally impossible, not just a policy promise,
for HR to identify who filed an anonymous item.

---

## 2. Employee-facing features

### Give feedback — `/submit` (public, no login required)
- Three input channels in one form: **text** (any language), **voice note** (recorded
  in-browser, transcribed server-side, audio never stored), and **photo/PDF upload**
  (OCR for handwritten suggestion slips or paper forms).
- Anonymous by default, with an optional name + email for identified feedback.
- Local, deterministic **privacy review** before submitting: flags emails, phone
  numbers, "my name is…", employee IDs, and "the only X on the team"-style phrasing
  that could de-anonymize the writer, with a one-click suggested rewrite.
- Department and category pickers (General, Suggestion, Concern, Appreciation, Report
  an issue).
- Returns a tracking code immediately (`VOC-XXXX-XXXX`); analysis happens in the
  background so submission feels instant (~0.3s) instead of waiting on the AI call.
- If the submitter is signed in, the item is linked to their account automatically
  (via a one-way hash if anonymous — see §6) so it shows up in their portal.

### Track a submission — `/track`, `/track/[code]` (public)
- Look up any tracking code (no login) to see status (`Received → In review → Action
  taken → Closed`), the HR response if one was posted, and the anonymous reply thread.

### Anonymous conversation thread — every feedback item
- Two-way, threaded follow-up between HR and the (possibly anonymous) submitter,
  reachable either by being signed in as the owner or via a private guest reply link —
  without ever revealing the submitter's identity to HR.
- HR can propose an **action commitment**: an owner, a due date, and (once done)
  written evidence of what changed.
- The employee can independently confirm the outcome — "Yes, it helped" or "Still
  happening" — recorded separately from HR's own "completed" status, so HR can't
  mark its own homework.
- Full history of every commitment revision is preserved (`feedback_action_history`).

### Employee portal — `/portal/*` (Google OAuth or email magic link)
- **Home (`/portal`)** — greeting, this week's check-in prompt, active surveys, latest
  "You said, we did" updates, and recent status changes on the employee's own feedback.
- **My feedback (`/portal/feedback`, `/portal/feedback/[code]`)** — every item the
  employee submitted (identified or anonymous), with a status timeline and any HR
  response, resolved without exposing the linkage to anyone but the employee.
- **Submit while signed in (`/portal/feedback/new`)** — same multimodal form, pre-filled
  identity for non-anonymous submissions.
- **Wellbeing check-ins (`/portal/checkin`)** — a 10-second weekly mood + energy rating
  (1–5) with an optional private note, plus the employee's own personal trend chart.
  Private by default; HR only ever sees org/department aggregates once at least 5
  people have responded that week (k-anonymity, enforced in the database, not the UI).
- **Pulse surveys (`/portal/surveys`, `/portal/surveys/[id]`)** — answer HR's active
  surveys (scale, eNPS, single-choice, or open text questions); one response per
  person, anonymous, enforced by a unique constraint on a hashed respondent ID.
- **Updates board (`/portal/updates`)** — the "You said, we did" feed, so employees can
  see the effect of feedback org-wide, not just their own.
- **Notifications (`/portal/notifications`)** — a bell with unread count; fires when
  HR responds to your feedback, changes its status, or publishes a new survey/update,
  even for anonymous submitters (keyed by the same one-way hash).
- **Onboarding (`/portal/welcome`)** — first-time name/department capture for a new
  portal account.

---

## 3. HR-facing features

All of the below live behind `/dashboard/*` and require an HR-provisioned account.

### Overview — `/dashboard`
- KPI tiles: feedback received (vs. previous period), average sentiment, urgent-and-
  open count, response rate — each tile's accent color only lights up when the metric
  actually needs attention (not decorative).
- Sentiment-by-week trend chart.
- "Needs attention" list of the most urgent unresolved items, with critical items
  visually distinguished from merely high-priority ones.
- Top themes bar chart, plus AI-detected **sub-topic micro-clusters** nested under
  each theme (e.g. under "Tools & Resources": "Slow laptop performance", "VPN
  disconnections").
- Department × theme sentiment **heatmap**.
- **Discontent Driver Analysis** — ranks which themes are actually driving negative
  sentiment org-wide (not just which are most-mentioned), scored by volume × severity.
- Risk radar (flagged risks: harassment, discrimination, burnout, attrition risk,
  safety, ethics, mental health) and a channel/department breakdown.
- Emotional tone word cloud.
- **Wellbeing card** — aggregated mood/energy trend across the org (k≥5 anonymity).
- **ImpactLoop™** — for every published "You said, we did" update, automatically
  compares the theme's average sentiment in the 30 days before vs. after publication,
  so HR can see whether their actions actually moved the needle.

### Feedback inbox — `/dashboard/feedback`
- Filterable, paginated table: department, theme, sentiment, urgency, status, channel,
  and full-text search (trigram-indexed) across summaries and redacted text.
- **Overview strip** (new): an aggregate visualization scoped to whatever filters are
  active — average sentiment gauge, sentiment breakdown, urgency breakdown — so HR
  gets a read on the whole (filtered) inbox before opening any single item.
- CSV export of the current filtered view.
- **Detail panel** (opens without losing the list, side-by-side on desktop / full-
  screen overlay on mobile):
  - AI summary, full redacted text (with a translation note if it wasn't in English),
    themes, detected emotions, risk flags, submitter identity (or "Anonymous").
  - **Sentiment gauge** — a compact SVG arc visualizing the −1…+1 score.
  - **Theme-context chart** — how this item's primary theme is trending among other
    feedback in the same department (falling back to org-wide) over the last 60 days,
    so HR can tell an isolated complaint from a pattern.
  - Suggested next step (AI-generated).
  - Status control (Received / In review / Action taken / Closed) with optimistic UI.
  - HR response box ("You said, we did" — emailed to the employee if identified).
  - The anonymous conversation thread and action-commitment/evidence tracker (§2).
  - Private internal notes, never shown to the employee.
  - "Re-run AI analysis" if processing failed.

### AI insight reports — `/dashboard/insights`
- On-demand leadership briefing generated from all analysed feedback in a chosen
  window (7/30/90 days), optionally scoped to one department.
- Headline, executive summary, **top concerns** (severity-ranked, with mention counts
  and evidence links back to source feedback), and a **prioritized action plan**
  (P1/P2/P3) — each action item now carries a **root cause**: the one concrete detail
  from the feedback that justifies it, shown as a highlighted callout so HR doesn't
  have to cross-reference to understand *why* an action exists — plus its own
  evidence links. Plus "bright spots" worth preserving or scaling.
- **Downloadable PDF** — pre-generated and cached at report-creation time (not
  regenerated per click), so the download is instant; includes the same root-cause
  callouts.
- One-click **"Publish to employees"** straight from an action item, turning it into
  a "You said, we did" update.
- **Email to leadership** via Resend, with the root cause and action plan inline.
- Report history sidebar (every past report stays accessible).
- The generation prompt is deliberately written to avoid corporate-report filler —
  plain verbs, no stock phrasing, concrete numbers, no invented facts.

### Ask AI — `/dashboard/ask`
- Grounded, streamed natural-language Q&A over the entire feedback corpus using
  `pgvector` cosine-similarity search (HNSW index) + Gemini.
- Answers cite exact sources inline (`[F3]`), which link back to the real feedback
  items, so nothing is presented as fact without a traceable source.
- Suggested follow-up questions after every answer.

### Pulse surveys — `/dashboard/surveys`, `/dashboard/surveys/new`, `/dashboard/surveys/[id]`
- Build surveys from four question types: 1–5 scale, eNPS (0–10), single choice, and
  open text.
- Draft → active → closed lifecycle; results only computed once published.
- Results view: averages, eNPS score, distribution charts, and an on-demand AI summary
  of open-text answers.
- CSV export of results.
- Anonymous by design — one response per person, enforced at the database level.

### Updates ("You said, we did") — `/dashboard/updates`
- Compose and publish organization-wide updates; each one automatically becomes a
  data point for ImpactLoop's before/after sentiment comparison.
- Every publish notifies employees and appears on the portal updates board.

### Bulk import — `/dashboard/import`
- Ingest paper forms / suggestion-box slips in bulk (photo/PDF), each one OCR'd and
  analysed independently, with a concurrency-limited processing queue and live
  per-item progress.

---

## 4. AI capabilities (Google Gemini)

| Capability | Where | Notes |
|---|---|---|
| Structured feedback analysis | every submission | Zod-validated JSON output: language, redacted English text, one-sentence summary, sentiment (+score), up to 4 emotions, 1–3 themes (fixed taxonomy), urgency, risk flags, a suggested action, and a sub-topic micro-label. |
| Speech-to-text | voice submissions | Transcribes 40+ languages in-memory; audio is never persisted. |
| OCR | photo/PDF submissions & bulk import | Reads handwritten or printed paper forms. |
| Embeddings + RAG | Ask AI | `gemini-embedding-001` vectors stored in `pgvector`, retrieved via HNSW cosine search, answers grounded and cited. |
| Insight report generation | Insights tab | Reads up to 300 recent items (prioritizing urgent/risk-flagged), computes real statistics first, then asks the model to synthesize a briefing — never to invent numbers. |
| Survey open-text summarization | Survey results | On-demand summary of free-text answers. |
| Model fallback chain | all Gemini calls | Multiple model tiers with automatic retry/backoff and a "thinking level" tuned per call type to cut latency (biggest single perf win: ~6s→~3s per call). |

---

## 5. Visualizations inventory

| Chart / widget | Where |
|---|---|
| KPI stat tiles with meaning-tied highlight color (only lights up when it matters) | Overview |
| Sentiment-by-week line/area trend | Overview |
| Department × theme sentiment heatmap | Overview |
| Top themes bar list + sub-topic micro-clusters | Overview |
| Discontent Driver ranking | Overview |
| ImpactLoop before/after sentiment comparison | Overview |
| Risk radar bar list | Overview |
| Channel & department breakdown | Overview |
| Wellbeing mood/energy trend (k-anonymous) | Overview, Portal |
| **Feedback inbox overview strip** (avg. sentiment gauge, sentiment breakdown, urgency breakdown, scoped to active filters) | Feedback inbox |
| **Per-item sentiment gauge** (SVG arc) | Feedback detail |
| **Theme-context bar chart** (is this a one-off or a pattern?) | Feedback detail |
| Survey results: averages, eNPS, response distribution | Surveys |
| Personal check-in trend | Portal |

(Bold rows were added most recently, on top of the dashboard's existing chart set.)

---

## 6. Anonymity & security architecture

This is enforced in the database, not just promised in the UI:

- **HMAC-SHA256 linking.** Anonymous feedback, survey responses, check-ins, and
  notifications from a signed-in employee are linked to their account only via
  `HMAC(secret, user_id)` — a one-way hash. There is no reverse path from hash to
  identity without the server secret, which HR never has access to.
- **Column-level database privileges.** HR's role has table-level `SELECT` revoked and
  re-granted per column on `feedback`, explicitly excluding `submitter_hash` and (as of
  the closed-loop migration) `raw_text` entirely — a direct Postgres query as HR
  returns "permission denied," not just an empty result.
- **Private intake table.** Raw submitted text is moved to a locked-down
  `feedback_private` table (service-role only) via a trigger the instant it's written;
  the HR-readable `feedback` row never holds it.
- **k-anonymity for wellbeing data.** A `SECURITY DEFINER` RPC only returns wellbeing
  aggregates for groups of 5 or more; smaller groups return nothing rather than a
  potentially-identifying data point.
- **Constraint-enforced anonymity.** A `CHECK` constraint makes it impossible to store
  a name/email/user-id alongside an anonymous submission at the database level.
- **Rate limiting** on public write endpoints (submission, OCR, transcription) via an
  in-memory sliding-window limiter.
- **RLS everywhere** — every table has row-level security policies scoped to `is_hr()`
  or record ownership; nothing relies on the client behaving.

---

## 7. Authentication & roles

- **HR**: email/password or Google OAuth, provisioned via an admin bootstrap script.
- **Employees**: Google OAuth or an emailed magic link (no password).
- Single unified `/login` page with an Employee/HR tab; post-auth routing sends each
  role to the right home (`/dashboard` vs `/portal`), with a "not provisioned as HR"
  fallback if an HR-tab sign-in doesn't have HR access.
- Session verification uses local JWT claim verification (`getClaims()`, ES256), not a
  network round-trip per request — a major page-load latency win.
- Two seeded **judge-facing demo accounts** (`developer_hr`, `developer_employee`),
  each pre-loaded with realistic personal data for live demos, credentials kept only
  in the gitignored `.env.local`, never in tracked files or git history.

---

## 8. Notifications

- In-app bell (portal) with unread count; triggers: HR status change, HR response,
  new active survey, new "You said, we did" update.
- Email (via Resend) for: critical/high-urgency risk alerts to HR, submission
  confirmations, HR responses to identified employees, insight-report digests,
  magic-link sign-in.
- Keyed by the same one-way hash as feedback, so anonymous submitters still get
  notified without HR (or the notification system itself) learning who they are.

---

## 9. API reference (all under `/api`)

| Route | Purpose |
|---|---|
| `POST /api/feedback` | Submit feedback (text/voice/photo); returns a tracking code instantly, analysis runs in the background. |
| `GET/PATCH /api/feedback/[id]` | Read/update a feedback item (status, HR response) — HR only. |
| `POST /api/feedback/[id]/notes` | Add a private internal HR note. |
| `POST /api/feedback/[id]/reprocess` | Re-run AI analysis after a failure. |
| `GET/POST /api/conversations/[code]` | Read/send messages on the anonymous conversation thread; manage the action commitment. |
| `GET /api/track/[code]` | Public status lookup by tracking code. |
| `POST /api/transcribe` | Speech-to-text for voice submissions. |
| `POST /api/ocr` | OCR for photo/PDF submissions. |
| `POST /api/import` | Bulk document ingestion. |
| `GET /api/export` | CSV export of the filtered feedback list. |
| `POST /api/ask` | Streamed, cited RAG answer over the feedback corpus. |
| `GET/POST /api/insights` | List / generate insight reports. |
| `GET /api/insights/[id]/pdf` | Download the (cached) PDF report. |
| `POST /api/insights/[id]/email` | Email a report to leadership. |
| `GET/POST /api/surveys`, `/api/surveys/[id]` | List/create/read surveys. |
| `POST /api/surveys/[id]/respond` | Submit a survey response (anonymous, one per person). |
| `GET /api/surveys/[id]/summary` | AI summary of open-text answers. |
| `GET /api/surveys/[id]/export` | CSV export of survey results. |
| `GET/POST /api/updates`, `/api/updates/[id]` | List/publish "You said, we did" updates. |
| `POST /api/wellbeing` | Submit a weekly check-in. |
| `GET /api/portal/my-feedback` | An employee's own feedback (identified + anonymous, via the hash). |
| `GET/POST /api/portal/notifications` | List/mark-read notifications. |
| `GET/PATCH /api/portal/profile` | Employee profile (name, department). |
| `GET /api/portal/checkin` | Personal check-in history/trend. |
| `GET /auth/callback` | OAuth/magic-link callback, routes by role. |

---

## 10. Data model (Postgres / Supabase)

`feedback` · `feedback_private` (raw text, service-role only) · `feedback_notes` ·
`feedback_messages` (conversation thread) · `feedback_actions` + `feedback_action_history`
(closed-loop commitments) · `insight_reports` (with cached `pdf_bytes`) · `hr_profiles` ·
`employee_profiles` · `surveys` + `survey_responses` · `checkins` · `updates` ·
`notifications` + `notification_reads`. Extensions: `pgvector` (embeddings/RAG),
`pg_trgm` (full-text search indexes).

---

## 11. Tech stack

Next.js 15 (App Router, RSC, streaming, `after()` for background work) · React 19 ·
TypeScript · Tailwind v4 · Supabase (Postgres, Auth, RLS, Management API) · Google
Gemini (`@google/genai`) · Zod (schema validation everywhere AI output lands) ·
Resend (transactional email) · `@react-pdf/renderer` (serverless-safe PDF generation) ·
Playwright (screenshot automation for the landing page, dev-only) · Vitest
(`@electric-sql/pglite` for real-Postgres-semantics database tests).

---

## 12. Developer tooling (`scripts/`)

`seed.ts` / `seed-data.ts` — org-wide demo data. `seed-portal.ts` — portal demo data
(fake employees, check-ins, surveys, updates). `create-hr.mjs` / `create-employee.mjs` /
`create-dev-logins.mjs` — account bootstrap (all credential-driven via `.env.local`,
never hardcoded). `db.mjs` — run raw SQL / migrations against Supabase via the
Management API. `dev-session.mjs` — print a session cookie for curl-based API testing
without a browser. `screenshots.ts` — headless Playwright capture for the landing
page's real product screenshots. `demo.mjs` — closed-loop feature walkthrough.
