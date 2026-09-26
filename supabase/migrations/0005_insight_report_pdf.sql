-- Cache the rendered PDF for each insight report so "Download PDF" is instant
-- (generated once, at report-creation time, not re-rendered on every click).
begin;

-- Stored as base64 text (not bytea) so PostgREST round-trips it as a plain JSON
-- string with no binary-encoding pitfalls.
alter table public.insight_reports
  add column pdf_bytes text,
  add column pdf_generated_at timestamptz;

commit;
