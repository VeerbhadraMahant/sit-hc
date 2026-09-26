-- Vocalyze — initial schema
-- Employees never talk to these tables directly: submissions and tracking go
-- through Next.js route handlers using the service role. HR users read and
-- update through RLS policies gated by public.is_hr().

create extension if not exists vector with schema extensions;

-- ── HR profiles ───────────────────────────────────────────────
create table public.hr_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'hr_admin' check (role in ('hr_admin', 'hr_viewer')),
  created_at timestamptz not null default now()
);

create or replace function public.is_hr()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.hr_profiles where user_id = (select auth.uid()));
$$;

-- ── Feedback (one row per submission, analysis inline) ───────
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tracking_code text not null unique,
  channel text not null default 'text' check (channel in ('text', 'voice', 'ocr')),
  source text not null default 'employee' check (source in ('employee', 'hr_import', 'seed')),
  language text,
  raw_text text,                -- original wording; cleared for anonymous submissions once analysed
  redacted_text text,           -- English, PII-redacted — what HR reads
  department text,
  category text,
  is_anonymous boolean not null default true,
  submitter_name text,
  submitter_email text,
  status text not null default 'new' check (status in ('new', 'in_review', 'actioned', 'closed')),
  hr_response text,
  responded_at timestamptz,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'done', 'failed')),
  processing_error text,
  sentiment text check (sentiment in ('positive', 'neutral', 'mixed', 'negative')),
  sentiment_score real check (sentiment_score between -1 and 1),
  emotions text[] not null default '{}',
  themes text[] not null default '{}',
  summary text,
  urgency text check (urgency in ('low', 'medium', 'high', 'critical')),
  risk_flags text[] not null default '{}',
  suggested_action text,
  embedding extensions.vector(768),
  constraint anonymous_has_no_identity check (not is_anonymous or (submitter_name is null and submitter_email is null))
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_department_idx on public.feedback (department);
create index feedback_urgency_idx on public.feedback (urgency) where urgency in ('high', 'critical');
create index feedback_themes_idx on public.feedback using gin (themes);
create index feedback_embedding_idx on public.feedback using hnsw (embedding extensions.vector_cosine_ops);

-- ── Insight reports (AI-generated, cached) ────────────────────
create table public.insight_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  department text,
  feedback_count integer not null,
  headline text not null,
  executive_summary text not null,
  top_concerns jsonb not null default '[]',
  positives jsonb not null default '[]',
  action_items jsonb not null default '[]'
);

create index insight_reports_created_at_idx on public.insight_reports (created_at desc);

-- ── Internal HR case notes (never visible to employees) ───────
create table public.feedback_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  feedback_id uuid not null references public.feedback (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_name text,
  body text not null check (char_length(body) between 1 and 4000)
);

create index feedback_notes_feedback_idx on public.feedback_notes (feedback_id, created_at);

-- ── Row level security ────────────────────────────────────────
alter table public.feedback_notes enable row level security;

create policy "HR can read notes" on public.feedback_notes
  for select to authenticated using ((select public.is_hr()));

create policy "HR can add notes" on public.feedback_notes
  for insert to authenticated with check ((select public.is_hr()) and author_id = (select auth.uid()));

alter table public.hr_profiles enable row level security;
alter table public.feedback enable row level security;
alter table public.insight_reports enable row level security;

create policy "HR can read own profile" on public.hr_profiles
  for select to authenticated using (user_id = (select auth.uid()));

create policy "HR can read feedback" on public.feedback
  for select to authenticated using ((select public.is_hr()));

create policy "HR can update feedback" on public.feedback
  for update to authenticated using ((select public.is_hr())) with check ((select public.is_hr()));

create policy "HR can read reports" on public.insight_reports
  for select to authenticated using ((select public.is_hr()));

create policy "HR can create reports" on public.insight_reports
  for insert to authenticated with check ((select public.is_hr()));

-- ── Semantic search for "Ask your feedback" ───────────────────
create or replace function public.match_feedback(
  query_embedding extensions.vector(768),
  match_count int default 12,
  filter_department text default null
)
returns table (
  id uuid,
  created_at timestamptz,
  department text,
  redacted_text text,
  summary text,
  sentiment text,
  urgency text,
  themes text[],
  similarity real
)
language sql
stable
set search_path = ''
as $$
  select f.id, f.created_at, f.department, f.redacted_text, f.summary, f.sentiment, f.urgency, f.themes,
         (1 - (f.embedding operator(extensions.<=>) query_embedding))::real as similarity
  from public.feedback f
  where f.embedding is not null
    and (filter_department is null or f.department = filter_department)
  order by f.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$$;

revoke execute on function public.match_feedback(extensions.vector, int, text) from public, anon;
grant execute on function public.match_feedback(extensions.vector, int, text) to authenticated, service_role;
revoke execute on function public.is_hr() from public, anon;
grant execute on function public.is_hr() to authenticated, service_role;
