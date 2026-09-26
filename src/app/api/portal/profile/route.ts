import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getSessionClaims } from "@/lib/supabase/server";
import { DEPARTMENTS } from "@/lib/types";

const BodySchema = z
  .object({
    fullName: z.string().trim().min(1, "Please tell us your name.").max(120),
    department: z.enum(DEPARTMENTS, { message: "Please choose your department." }),
  })
  .strict();

/** Creates or updates the signed-in employee's profile (RLS: own row only). */
export async function POST(req: Request) {
  const session = await getSessionClaims();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_profiles")
    .upsert({ user_id: session.id, full_name: parsed.data.fullName, department: parsed.data.department } as never);
  if (error) {
    console.error("[api/portal/profile]", error.message);
    return NextResponse.json({ error: "We couldn't save your profile. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
