import { NextResponse } from "next/server";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHrUser } from "@/lib/supabase/server";
import type { InsightReport } from "@/lib/types";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data } = await createAdminClient().from("insight_reports").select("*").eq("id", id).maybeSingle();
  const report = data as InsightReport | null;
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const to = process.env.HR_ALERT_EMAIL || user.email;
  if (!to) return NextResponse.json({ error: "No recipient configured (HR_ALERT_EMAIL)" }, { status: 400 });

  const period = `${report.period_start.slice(0, 10)} → ${report.period_end.slice(0, 10)}`;
  const concerns = report.top_concerns
    .map(
      (c) =>
        `<li style="margin-bottom:8px"><strong>${escapeHtml(c.title)}</strong> <span style="color:#6b6d72">(${escapeHtml(c.severity)}, ${c.mention_count} mentions)</span><br/>${escapeHtml(c.description)}</li>`,
    )
    .join("");
  const actions = report.action_items
    .map(
      (a) =>
        `<li style="margin-bottom:8px"><strong>[${a.priority}] ${escapeHtml(a.title)}</strong><br/><span style="color:#6b6d72">${escapeHtml(a.owner)} · ${escapeHtml(a.timeframe)}</span><br/>${escapeHtml(a.description)}</li>`,
    )
    .join("");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const result = await sendEmail({
    to,
    subject: `Vocalyze insight report — ${report.headline}`,
    html: emailLayout({
      eyebrow: `Insight report · ${period}${report.department ? ` · ${report.department}` : ""}`,
      title: report.headline,
      body: `<p>${escapeHtml(report.executive_summary)}</p>
<p style="margin-top:20px;font-weight:600">Top concerns</p><ol style="padding-left:18px">${concerns}</ol>
<p style="margin-top:20px;font-weight:600">Recommended actions</p><ul style="padding-left:18px">${actions}</ul>
<p style="color:#6b6d72;font-size:13px">Based on ${report.feedback_count} analysed feedback items. Shared by ${escapeHtml(user.fullName ?? user.email ?? "HR")}.</p>`,
      cta: { label: "Open full report", href: `${appUrl}/dashboard/insights?report=${report.id}` },
    }),
  });

  if (!result.ok) return NextResponse.json({ error: "Email could not be sent", detail: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, to });
}
