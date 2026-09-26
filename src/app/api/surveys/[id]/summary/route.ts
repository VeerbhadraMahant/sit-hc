import { NextResponse } from "next/server";
import { z } from "zod";
import { getSurveyForHr } from "@/components/surveys/data";
import { summarizeSurveyAnswers } from "@/lib/ai/survey-summary";
import { getHrUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const BodySchema = z.object({ questionId: z.string().min(1) });

/** HR: AI summary of one open-text question's answers. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getHrUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  const data = await getSurveyForHr(id);
  if (!data) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  const question = data.survey.questions.find((q) => q.id === parsed.data.questionId);
  if (!question || question.type !== "text") return NextResponse.json({ error: "Not an open-text question" }, { status: 400 });

  const answers = data.responses
    .map((r) => r.answers?.[question.id])
    .filter((a): a is string => typeof a === "string" && a.trim().length > 0);
  if (answers.length < 3) {
    return NextResponse.json({ error: "Need at least 3 answers to summarise." }, { status: 422 });
  }

  try {
    const summary = await summarizeSurveyAnswers({
      title: data.survey.title,
      question: question.prompt,
      answers,
      context: data.survey.description ?? undefined,
    });
    return NextResponse.json({ summary, answerCount: answers.length });
  } catch (err) {
    console.error("[api/surveys/summary]", err);
    return NextResponse.json({ error: "The AI summary failed. Please try again." }, { status: 502 });
  }
}
