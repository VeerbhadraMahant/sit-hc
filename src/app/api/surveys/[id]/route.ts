import { NextResponse } from "next/server";
import { z } from "zod";
import { SURVEY_COLUMNS } from "@/components/surveys/data";
import { notify } from "@/lib/notify";
import { createClient, getHrUser } from "@/lib/supabase/server";
import { SurveyInputSchema } from "@/lib/surveys";
import type { Survey } from "@/lib/types";

const PatchSchema = z.union([
  z.object({ action: z.enum(["publish", "close", "reopen"]) }).strict(),
  SurveyInputSchema.extend({ action: z.literal("update") }),
]);

/** HR: edit a draft, or move a survey through draft → active → closed. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getHrUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const { data: current } = await supabase.from("surveys").select(SURVEY_COLUMNS).eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  const survey = current as Survey;

  let patch: Record<string, unknown>;
  const body = parsed.data;
  if (body.action === "update") {
    if (survey.status !== "draft") {
      return NextResponse.json({ error: "Published surveys can't be edited — it would invalidate responses." }, { status: 409 });
    }
    const { action: _action, ...input } = body;
    void _action;
    patch = { ...input, description: input.description || null, closes_at: input.closes_at || null };
  } else if (body.action === "publish") {
    if (survey.status !== "draft") return NextResponse.json({ error: "Only drafts can be published." }, { status: 409 });
    patch = { status: "active", published_at: new Date().toISOString() };
  } else if (body.action === "close") {
    if (survey.status !== "active") return NextResponse.json({ error: "Only active surveys can be closed." }, { status: 409 });
    patch = { status: "closed", closes_at: new Date().toISOString() };
  } else {
    if (survey.status !== "closed") return NextResponse.json({ error: "Only closed surveys can be reopened." }, { status: 409 });
    patch = { status: "active", closes_at: null };
  }

  const { data, error } = await supabase.from("surveys").update(patch as never).eq("id", id).select(SURVEY_COLUMNS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (body.action === "publish") {
    await notify({
      recipient: "all",
      type: "survey",
      title: `New survey: ${survey.title}`,
      body: "Takes about two minutes. Your answers are anonymous.",
      link: `/portal/surveys/${id}`,
    });
  }
  return NextResponse.json({ survey: data });
}

/** HR: delete a draft (published surveys are closed instead, to keep their results). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getHrUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("surveys").select("status").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if ((data as { status: string }).status !== "draft") {
    return NextResponse.json({ error: "Only drafts can be deleted. Close the survey instead." }, { status: 409 });
  }
  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
