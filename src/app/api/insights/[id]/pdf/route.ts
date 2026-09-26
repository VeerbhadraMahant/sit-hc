import { NextResponse } from "next/server";
import { renderInsightReportPdf } from "@/lib/pdf/insight-report-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHrUser } from "@/lib/supabase/server";
import type { InsightReport } from "@/lib/types";

export const maxDuration = 30;

function fileName(report: InsightReport) {
  const period = report.period_end.slice(0, 10);
  const dept = (report.department ?? "all-departments").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `vocalyze-insights-${dept}-${period}.pdf`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = createAdminClient();
  const { data, error } = await db.from("insight_reports").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const report = data as InsightReport & { pdf_bytes: string | null };
  let bytes: Buffer;
  if (report.pdf_bytes) {
    bytes = Buffer.from(report.pdf_bytes, "base64");
  } else {
    // Pre-generation failed or this report predates the feature — render once now and cache it.
    bytes = await renderInsightReportPdf(report);
    await db
      .from("insight_reports")
      .update({ pdf_bytes: bytes.toString("base64"), pdf_generated_at: new Date().toISOString() } as never)
      .eq("id", id);
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName(report)}"`,
      // Reports are immutable once generated — safe to cache hard, per-report id.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
