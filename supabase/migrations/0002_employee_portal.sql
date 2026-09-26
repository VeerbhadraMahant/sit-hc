-- Vocalyze — employee portal, surveys, wellbeing, updates, notifications, perf indexes.

create extension if not exists pg_trgm with schema extensions;

-- ── Employee profiles ─────────────────────────────────────────
create table if not exists public.employee_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  department text,
  created_at timestamptz not null default now()
);

alter table public.employee_profiles enable row level security;

drop policy if exists "Employees read own profile" on public.employee_profiles;
create policy "Employees read own profile" on public.employee_profiles
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Employees create own profile" on public.employee_profiles;
create policy "Employees create own profile" on public.employee_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Employees update own profile" on public.employee_profiles;
create policy "Employees update own profile" on public.employee_profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Feedback: link to employees ───────────────────────────────
alter table public.feedback
  add column if not exists submitter_user_id uuid references auth.users (id) on delete set null,
  add column if not exists submitter_hash text;

alter table public.feedback drop constraint if exists anonymous_has_no_identity;
alter table public.feedback add constraint anonymous_has_no_identity check (
  not is_anonymous or (submitter_name is null and submitter_email is null and submitter_user_id is null)
);

alter table public.feedback drop constraint if exists identified_has_no_hash;
alter table public.feedback add constraint identified_has_no_hash check (is_anonymous or submitter_hash is null);

create index if not exists feedback_submitter_user_idx on public.feedback (submitter_user_id) where submitter_user_id is not null;
create index if not exists feedback_submitter_hash_idx on public.feedback (submitter_hash) where submitter_hash is not null;
create index if not exists feedback_redacted_trgm_idx on public.feedback using gin (redacted_text extensions.gin_trgm_ops);
create index if not exists feedback_summary_trgm_idx on public.feedback using gin (summary extensions.gin_trgm_ops);

-- HR (authenticated role) may read every feedback column except submitter_hash.
revoke select on public.feedback from authenticated, anon;
grant select (
  id, created_at, tracking_code, channel, source, language, raw_text, redacted_text, department, category,
  is_anonymous, submitter_name, submitter_email, submitter_user_id, status, hr_response, responded_at,
  processing_status, processing_error, sentiment, sentiment_score, emotions, themes, summary, urgency,
  risk_flags, suggested_action, embedding
) on public.feedback to authenticated;

-- ── Pulse surveys ─────────────────────────────────────────────
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  description text,
  questions jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  published_at timestamptz,
  closes_at timestamptz
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  respondent_hash text not null,
  department text,
  answers jsonb not null,
  unique (survey_id, respondent_hash)
);

create index if not exists survey_responses_survey_idx on public.survey_responses (survey_id);

alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;

drop policy if exists "HR manage surveys" on public.surveys;
create policy "HR manage surveys" on public.surveys
  for all to authenticated using ((select public.is_hr())) with check ((select public.is_hr()));

drop policy if exists "Employees read live surveys" on public.surveys;
create policy "Employees read live surveys" on public.surveys
  for select to authenticated using (status in ('active', 'closed'));

drop policy if exists "HR read survey responses" on public.survey_responses;
create policy "HR read survey responses" on public.survey_responses
  for select to authenticated using ((select public.is_hr()));

revoke select on public.survey_responses from authenticated, anon;
grant select (id, created_at, survey_id, department, answers) on public.survey_responses to authenticated;

-- ── Wellbeing check-ins ───────────────────────────────────────
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,               -- Monday of the ISO week
  mood smallint not null check (mood between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  note text check (char_length(note) <= 500),
  department text,
  unique (user_id, week)
);

create index if not exists checkins_week_idx on public.checkins (week);

alter table public.checkins enable row level security;

drop policy if exists "Employees read own checkins" on public.checkins;
create policy "Employees read own checkins" on public.checkins
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Employees add own checkins" on public.checkins;
create policy "Employees add own checkins" on public.checkins
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Employees update own checkins" on public.checkins;
create policy "Employees update own checkins" on public.checkins
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- HR only ever sees aggregates, and only for groups of 5+ people (k-anonymity).
create or replace function public.wellbeing_aggregates(weeks int default 8)
returns table (week date, department text, respondents int, avg_mood real, avg_energy real)
language sql
stable
security definer
set search_path = ''
as $$
  select c.week, c.department, count(distinct c.user_id)::int, avg(c.mood)::real, avg(c.energy)::real
  from public.checkins c
  where (select public.is_hr())
    and c.week >= (current_date - (weeks * 7))
  group by grouping sets ((c.week, c.department), (c.week))
  having count(distinct c.user_id) >= 5
  order by 1, 2 nulls first;
$$;

revoke execute on function public.wellbeing_aggregates(int) from public, anon;
grant execute on function public.wellbeing_aggregates(int) to authenticated, service_role;

-- ── "You said, we did" updates ────────────────────────────────
create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 1 and 4000),
  theme text,
  department text,
  feedback_count int,
  status text not null default 'published' check (status in ('draft', 'published')),
  published_at timestamptz default now()
);

create index if not exists updates_published_idx on public.updates (published_at desc);

alter table public.updates enable row level security;

drop policy if exists "HR manage updates" on public.updates;
create policy "HR manage updates" on public.updates
  for all to authenticated using ((select public.is_hr())) with check ((select public.is_hr()));

drop policy if exists "Employees read published updates" on public.updates;
create policy "Employees read published updates" on public.updates
  for select to authenticated using (status = 'published');

-- ── Notifications (keyed by hash so anonymous submitters can be notified) ──
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  recipient_hash text,              -- null = broadcast to all employees
  type text not null check (type in ('feedback_status', 'feedback_response', 'survey', 'update', 'system')),
  title text not null,
  body text,
  link text,
  read_at timestamptz
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_hash, created_at desc);
create index if not exists notifications_broadcast_idx on public.notifications (created_at desc) where recipient_hash is null;

alter table public.notifications enable row level security;

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  recipient_hash text not null,
  read_at timestamptz not null default now(),
  primary key (notification_id, recipient_hash)
);
alter table public.notification_reads enable row level security;
