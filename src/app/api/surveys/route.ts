import { NextResponse } from "next/server";
import { listSurveysForHr, SURVEY_COLUMNS } from "@/components/surveys/data";
import { notify } from "@/lib/notify";
import { createClient, getHrUser } from "@/lib/supabase/server";
import { SurveyInputSchema } from "@/lib/surveys";

/** HR: list surveys with response counts. */
export async function GET() {
  if (!(await getHrUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ surveys: await listSurveysForHr() });
}

/** HR: create a survey as a draft, or publish immediately with ?publish=1. */
export async function POST(req: Request) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = SurveyInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid survey" }, { status: 400 });

  const publish = new URL(req.url).searchParams.get("publish") === "1";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("surveys")
    .insert({
      ...parsed.data,
      description: parsed.data.description || null,
      closes_at: parsed.data.closes_at || null,
      created_by: user.id,
      status: publish ? "active" : "draft",
      published_at: publish ? new Date().toISOString() : null,
    } as never)
    .select(SURVEY_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const survey = data as { id: string; title: string };
  if (publish) {
    await notify({ recipient: "all", type: "survey", title: `New survey: ${survey.title}`, body: "Takes about two minutes. Your answers are anonymous.", link: `/portal/surveys/${survey.id}` });
  }
  return NextResponse.json({ survey }, { status: 201 });
}
