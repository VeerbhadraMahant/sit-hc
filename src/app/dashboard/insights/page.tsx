import { InsightsView } from "@/components/insights/insights-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireHr } from "@/lib/supabase/server";
import type { InsightReport } from "@/lib/types";

export const metadata = { title: "Insights — Pulse" };
export const dynamic = "force-dynamic";

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  await requireHr();
  const { report: reportId } = await searchParams;
  const db = createAdminClient();

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [{ data: reports }, { count }] = await Promise.all([
    db.from("insight_reports").select("*").order("created_at", { ascending: false }).limit(20),
    db
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "done")
      .gte("created_at", since),
  ]);

  return (
    <InsightsView
      initialReports={(reports ?? []) as InsightReport[]}
      initialReportId={reportId ?? null}
      recentCount={count ?? 0}
    />
  );
}
