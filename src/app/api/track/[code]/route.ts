import { NextResponse } from "next/server";
import { lookupFeedback } from "@/app/track/lookup";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!rateLimit(`track:${clientIp(req)}`, 30)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { code } = await params;
  const feedback = await lookupFeedback(code);
  if (!feedback) return NextResponse.json({ error: "No feedback found for that code." }, { status: 404 });
  return NextResponse.json(feedback, { headers: { "Cache-Control": "no-store" } });
}
