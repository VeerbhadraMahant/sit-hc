import { NextResponse } from "next/server";
import { z } from "zod";
import { listNotifications, markNotificationsRead } from "@/lib/notify";
import { getSessionClaims } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const session = await getSessionClaims();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 20, 100);
  const result = await listNotifications(session.id, limit);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

const BodySchema = z.object({ ids: z.array(z.string().uuid()).max(100).optional() }).strict();

/** Marks the given notifications (or all visible ones) as read. */
export async function POST(req: Request) {
  const session = await getSessionClaims();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  await markNotificationsRead(session.id, parsed.data.ids);
  return NextResponse.json({ ok: true });
}
