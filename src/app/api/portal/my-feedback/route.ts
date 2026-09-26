import { NextResponse } from "next/server";
import { feedbackStats, listMyFeedback } from "@/components/portal/data";
import { getSessionClaims } from "@/lib/supabase/server";

/** The signed-in employee's own feedback — identified items and anonymous ones linked by HMAC. */
export async function GET() {
  const session = await getSessionClaims();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const items = await listMyFeedback(session.id);
  return NextResponse.json({ items, stats: feedbackStats(items) }, { headers: { "Cache-Control": "no-store" } });
}
