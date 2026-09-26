import { NextResponse } from "next/server";
import { z } from "zod";
import { isoWeekStart } from "@/lib/identity";
import { createClient, getSessionClaims } from "@/lib/supabase/server";

const BodySchema = z
  .object({
    mood: z.number().int().min(1).max(5),
    energy: z.number().int().min(1).max(5),
    note: z.string().trim().max(500).nullish(),
  })
  .strict();

const CHECKIN_COLUMNS = "id,created_at,week,mood,energy,note";

/** Last 12 weekly check-ins for the signed-in employee (RLS: own rows only). */
export async function GET() {
  const session = await getSessionClaims();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkins")
    .select(CHECKIN_COLUMNS)
    .eq("user_id", session.id)
    .order("week", { ascending: false })
    .limit(12);
  if (error) return NextResponse.json({ error: "Couldn't load check-ins." }, { status: 500 });
  return NextResponse.json({ items: data ?? [], week: isoWeekStart() }, { headers: { "Cache-Control": "no-store" } });
}

/** Saves (or updates) this week's check-in. */
export async function POST(req: Request) {
  const session = await getSessionClaims();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid check-in." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("employee_profiles")
    .select("department")
    .eq("user_id", session.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("checkins")
    .upsert(
      {
        user_id: session.id,
        week: isoWeekStart(),
        mood: parsed.data.mood,
        energy: parsed.data.energy,
        note: parsed.data.note || null,
        department: (profile as { department: string | null } | null)?.department ?? null,
      } as never,
      { onConflict: "user_id,week" },
    )
    .select(CHECKIN_COLUMNS)
    .single();
  if (error) {
    console.error("[api/portal/checkin]", error.message);
    return NextResponse.json({ error: "We couldn't save your check-in. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ checkin: data });
}
