import { InsightsView } from "@/components/insights/insights-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireHr } from "@/lib/supabase/server";
import type { InsightReport } from "@/lib/types";

export const metadata = { title: "Insights — Vocalyze" };
export const dynamic = "force-dynamic";

import { DEMO_INSIGHT_REPORTS } from "@/lib/demo-fallback";

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  await requireHr();
  const { report: reportId } = await searchParams;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <InsightsView
        initialReports={DEMO_INSIGHT_REPORTS as unknown as InsightReport[]}
        initialReportId={reportId ?? DEMO_INSIGHT_REPORTS[0].id}
        recentCount={47}
      />
    );
  }

  try {
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
  } catch (err) {
    console.warn("InsightsPage falling back to demo reports:", err);
    return (
      <InsightsView
        initialReports={DEMO_INSIGHT_REPORTS as unknown as InsightReport[]}
        initialReportId={reportId ?? DEMO_INSIGHT_REPORTS[0].id}
        recentCount={47}
      />
    );
  }
}
