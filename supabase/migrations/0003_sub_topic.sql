-- Vocalyze — add sub_topic column to feedback
-- Run this in the Supabase SQL editor if using hosted Supabase (not local CLI).
alter table public.feedback add column if not exists sub_topic text;

-- Grant HR (authenticated) read access to the new column.
grant select (sub_topic) on public.feedback to authenticated;

create index if not exists feedback_sub_topic_trgm_idx
  on public.feedback using gin (sub_topic extensions.gin_trgm_ops)
  where sub_topic is not null;
