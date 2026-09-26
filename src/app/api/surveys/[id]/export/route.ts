import { getSurveyForHr } from "@/components/surveys/data";
import { getHrUser } from "@/lib/supabase/server";
import { csvCell } from "@/lib/surveys";

/** HR: CSV of all responses (no respondent identifiers — there are none to export). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getHrUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const data = await getSurveyForHr(id);
  if (!data) return new Response("Not found", { status: 404 });

  const { survey, responses } = data;
  const header = ["submitted_at", "department", ...survey.questions.map((q) => q.prompt)];
  const rows = responses.map((r) => [
    r.created_at,
    r.department ?? "",
    ...survey.questions.map((q) => r.answers?.[q.id] ?? ""),
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const slug = survey.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "survey";

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vocalyze-${slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
