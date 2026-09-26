import { NextResponse } from "next/server";
import { isOpen, SURVEY_COLUMNS, surveyRespondentHash } from "@/components/surveys/data";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getEmployeeUser } from "@/lib/supabase/server";
import { validateAnswers } from "@/lib/surveys";
import type { Survey } from "@/lib/types";

/**
 * Employee: submit one anonymous response. The server derives a per-survey HMAC of the
 * user id (so each person answers once) and stores only that hash + their department.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getEmployeeUser();
  if (!user) return NextResponse.json({ error: "Please sign in to answer surveys." }, { status: 401 });
  if (!user.onboarded) return NextResponse.json({ error: "Finish setting up your profile first." }, { status: 403 });
  if (!rateLimit(`survey:${user.id}:${clientIp(req)}`, 10)) {
    return NextResponse.json({ error: "Too many attempts — please wait a minute." }, { status: 429 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("surveys").select(SURVEY_COLUMNS).eq("id", id).maybeSingle();
  const survey = data as Survey | null;
  if (!survey || survey.status === "draft") return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  if (!isOpen(survey)) return NextResponse.json({ error: "This survey is closed." }, { status: 409 });

  const body = (await req.json().catch(() => null)) as { answers?: unknown } | null;
  const result = validateAnswers(survey.questions, body?.answers);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const { error } = await createAdminClient()
    .from("survey_responses")
    .insert({
      survey_id: id,
      respondent_hash: surveyRespondentHash(user.id, id),
      department: user.department,
      answers: result.answers,
    } as never);
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "You've already answered this survey." }, { status: 409 });
    console.error("[api/surveys/respond]", error.message);
    return NextResponse.json({ error: "Couldn't save your answers. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
