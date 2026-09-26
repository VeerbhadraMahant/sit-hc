-- Private intake, anonymous conversations, and employee-confirmed outcomes.
begin;

create table if not exists public.feedback_private (
  feedback_id uuid primary key references public.feedback(id) on delete cascade,
  raw_text text,
  reply_token_hash text
);
alter table public.feedback_private enable row level security;
revoke all on public.feedback_private from anon, authenticated;
grant all on public.feedback_private to service_role;

insert into public.feedback_private(feedback_id, raw_text)
select id, raw_text from public.feedback
on conflict (feedback_id) do nothing;

update public.feedback set raw_text = null;
-- Old provider errors may contain submitted text; replace them with a safe retry message.
update public.feedback set processing_error = 'Processing unavailable. Private input is retained for retry.'
where processing_error is not null;

-- Keep existing import/seed callers compatible, but never retain intake in HR-readable rows.
create or replace function public.move_feedback_intake() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.feedback_private(feedback_id, raw_text)
  values (new.id, new.raw_text)
  on conflict (feedback_id) do update set raw_text = excluded.raw_text;
  if new.raw_text is not null then
    update public.feedback set raw_text = null where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_feedback_intake on public.feedback;
create trigger protect_feedback_intake after insert on public.feedback
for each row execute function public.move_feedback_intake();

drop trigger if exists protect_feedback_intake_update on public.feedback;
create trigger protect_feedback_intake_update after update of raw_text on public.feedback
for each row when (new.raw_text is not null) execute function public.move_feedback_intake();

revoke all on function public.move_feedback_intake() from public;

-- Only service-role ingestion can write raw input; HR cannot change identity or analysis.
revoke update on public.feedback from authenticated;
grant update(status, hr_response, responded_at) on public.feedback to authenticated;
revoke select(raw_text) on public.feedback from authenticated;

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  created_at timestamptz not null default now(),
  author_role text not null check (author_role in ('employee', 'hr')),
  body text not null check (char_length(body) between 1 and 4000)
);
create index if not exists feedback_messages_thread_idx on public.feedback_messages(feedback_id, created_at);
alter table public.feedback_messages enable row level security;
revoke all on public.feedback_messages from anon, authenticated;
grant select on public.feedback_messages to authenticated;
grant all on public.feedback_messages to service_role;

drop policy if exists "HR read conversations" on public.feedback_messages;
create policy "HR read conversations" on public.feedback_messages
for select to authenticated using ((select public.is_hr()));

create table if not exists public.feedback_actions (
  feedback_id uuid primary key references public.feedback(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 500),
  owner text not null check (char_length(owner) between 2 and 120),
  due_date date not null,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),
  evidence text not null default '' check (char_length(evidence) <= 4000),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  employee_outcome text check (employee_outcome in ('resolved', 'still_happening')),
  confirmed_at timestamptz,
  check (status <> 'completed' or char_length(trim(evidence)) >= 10),
  check (employee_outcome is null or status = 'completed')
);
alter table public.feedback_actions enable row level security;
revoke all on public.feedback_actions from anon, authenticated;
grant select on public.feedback_actions to authenticated;
grant all on public.feedback_actions to service_role;

drop policy if exists "HR read action outcomes" on public.feedback_actions;
create policy "HR read action outcomes" on public.feedback_actions
for select to authenticated using ((select public.is_hr()));

-- Preserve changes and employee confirmations independently of the current action.
create table if not exists public.feedback_action_history (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  created_at timestamptz not null default now(),
  snapshot jsonb not null
);
alter table public.feedback_action_history enable row level security;
revoke all on public.feedback_action_history from anon, authenticated;
grant select on public.feedback_action_history to authenticated;
grant all on public.feedback_action_history to service_role;

drop policy if exists "HR read action history" on public.feedback_action_history;
create policy "HR read action history" on public.feedback_action_history
for select to authenticated using ((select public.is_hr()));

create or replace function public.record_feedback_action() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.feedback_action_history(feedback_id, snapshot) values(new.feedback_id, to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists record_action_change on public.feedback_actions;
create trigger record_action_change after insert or update on public.feedback_actions
for each row execute function public.record_feedback_action();

revoke all on function public.record_feedback_action() from public;
commit;
