import { NextResponse } from "next/server";
import { z } from "zod";
import { streamAnswer, type AskEvent } from "@/lib/ai/ask";
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

/** Streams newline-delimited JSON AskEvents (sources → delta* → done | error). */
export async function POST(req: Request) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Please ask a question (3–1000 characters)." }, { status: 400 });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AskEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        for await (const event of streamAnswer(parsed.data.question, {
          department: parsed.data.department || null,
          history: parsed.data.history,
        })) {
          send(event);
        }
      } catch (err) {
        console.error("[ask] failed", err);
        send({ type: "error", message: "The AI service is busy. Please try again in a moment." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
