-- Vocalyze — add sub_topic column to feedback
alter table public.feedback add column if not exists sub_topic text;

-- Grant HR (authenticated) read access to the new column.
grant select (sub_topic) on public.feedback to authenticated;

create index if not exists feedback_sub_topic_idx
  on public.feedback (sub_topic)
  where sub_topic is not null;
