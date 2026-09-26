import "server-only";
import { anonHash } from "@/lib/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Survey, SurveyAnswers } from "@/lib/types";

export const SURVEY_COLUMNS = "id,created_at,title,description,questions,status,published_at,closes_at";

/** Per-survey respondent hash: responses can't be linked across surveys, even by HR with DB access. */
export const surveyRespondentHash = (userId: string, surveyId: string) => anonHash(userId, `survey:${surveyId}`);

export type SurveyWithCount = Survey & { responses: number };

/** HR: all surveys with response counts (RLS: HR only). */
export async function listSurveysForHr(): Promise<SurveyWithCount[]> {
  const supabase = await createClient();
  const [{ data: surveys }, { data: responses }] = await Promise.all([
    supabase.from("surveys").select(SURVEY_COLUMNS).order("created_at", { ascending: false }),
    supabase.from("survey_responses").select("survey_id").limit(10000),
  ]);
  const counts = new Map<string, number>();
  for (const r of (responses ?? []) as { survey_id: string }[]) counts.set(r.survey_id, (counts.get(r.survey_id) ?? 0) + 1);
  return ((surveys ?? []) as Survey[]).map((s) => ({ ...s, responses: counts.get(s.id) ?? 0 }));
}

export type SurveyResponseRow = { id: string; created_at: string; department: string | null; answers: SurveyAnswers };

/** HR: one survey + its responses (never the respondent hash). */
export async function getSurveyForHr(id: string) {
  const supabase = await createClient();
  const [{ data: survey }, { data: responses }, { count: employees }] = await Promise.all([
    supabase.from("surveys").select(SURVEY_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("survey_responses")
      .select("id,created_at,department,answers")
      .eq("survey_id", id)
      .order("created_at", { ascending: true })
      .limit(5000),
    // HR can't read other employees' profiles through RLS; count via the admin client (already HR-gated by caller).
    createAdminClient().from("employee_profiles").select("user_id", { count: "exact", head: true }),
  ]);
  if (!survey) return null;
  return {
    survey: survey as Survey,
    responses: (responses ?? []) as SurveyResponseRow[],
    employeeCount: employees ?? 0,
  };
}

export type EmployeeSurvey = Survey & { answered: boolean };

/** Employee: live (active + recently closed) surveys with this employee's answered state. */
export async function listSurveysForEmployee(userId: string, { includeClosed = true } = {}): Promise<EmployeeSurvey[]> {
  const supabase = await createClient();
  let query = supabase.from("surveys").select(SURVEY_COLUMNS).order("published_at", { ascending: false }).limit(30);
  query = includeClosed ? query.in("status", ["active", "closed"]) : query.eq("status", "active");
  const { data } = await query;
  const surveys = (data ?? []) as Survey[];
  if (!surveys.length) return [];
  const hashes = surveys.map((s) => surveyRespondentHash(userId, s.id));
  const { data: mine } = await createAdminClient()
    .from("survey_responses")
    .select("survey_id")
    .in("respondent_hash", hashes);
  const answered = new Set(((mine ?? []) as { survey_id: string }[]).map((r) => r.survey_id));
  return surveys.map((s) => ({ ...s, answered: answered.has(s.id) }));
}

export async function getSurveyForEmployee(userId: string, id: string): Promise<EmployeeSurvey | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("surveys").select(SURVEY_COLUMNS).eq("id", id).in("status", ["active", "closed"]).maybeSingle();
  if (!data) return null;
  const { count } = await createAdminClient()
    .from("survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", id)
    .eq("respondent_hash", surveyRespondentHash(userId, id));
  return { ...(data as Survey), answered: (count ?? 0) > 0 };
}

export function isOpen(s: Pick<Survey, "status" | "closes_at">) {
  return s.status === "active" && (!s.closes_at || new Date(s.closes_at).getTime() > Date.now());
}
