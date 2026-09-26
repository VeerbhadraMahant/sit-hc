import { NextResponse } from "next/server";
import { z } from "zod";
import { generateInsightReport } from "@/lib/ai/insights";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHrUser } from "@/lib/supabase/server";
import { INSIGHT_REPORT_COLUMNS } from "@/lib/types";

export const maxDuration = 60;

const Body = z.object({
  range: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  department: z.string().max(80).nullish(),
});

export async function GET() {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminClient()
    .from("insight_reports")
    .select(INSIGHT_REPORT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data });
}

export async function POST(req: Request) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const to = new Date();
  const from = new Date(to.getTime() - parsed.data.range * 86400_000);
  try {
    const result = await generateInsightReport({
      from,
      to,
      department: parsed.data.department || null,
      createdBy: user.id,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ report: result.report });
  } catch (err) {
    console.error("[insights] generation failed", err);
    return NextResponse.json({ error: "The AI service is busy. Please try again in a moment." }, { status: 503 });
  }
}
