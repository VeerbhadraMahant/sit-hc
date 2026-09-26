import { NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion } from "@/lib/ai/ask";
import { getHrUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const Body = z.object({
  question: z.string().trim().min(3).max(1000),
  department: z.string().max(80).nullish(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(20)
    .default([]),
});

export async function POST(req: Request) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Please ask a question (3–1000 characters)." }, { status: 400 });

  try {
    const result = await answerQuestion(parsed.data.question, {
      department: parsed.data.department || null,
      history: parsed.data.history,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ask] failed", err);
    return NextResponse.json({ error: "The AI service is busy. Please try again in a moment." }, { status: 503 });
  }
}
