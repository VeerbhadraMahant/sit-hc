import { NextResponse } from "next/server";
import { UPDATE_COLUMNS, UpdateInputSchema } from "@/components/updates/schema";
import { notify } from "@/lib/notify";
import { createClient, getHrUser } from "@/lib/supabase/server";

/** Any signed-in user: published updates (RLS). HR additionally sees drafts. */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("updates")
    .select(UPDATE_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ updates: data ?? [] });
}

/** HR: publish a "You said, we did" update and notify every employee. */
export async function POST(req: Request) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = UpdateInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("updates")
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      theme: parsed.data.theme ?? null,
      department: parsed.data.department || null,
      feedback_count: parsed.data.feedback_count ?? null,
      published_by: user.id,
      status: "published",
      published_at: new Date().toISOString(),
    } as never)
    .select(UPDATE_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const update = data as { title: string };
  await notify({
    recipient: "all",
    type: "update",
    title: `You said, we did: ${update.title}`,
    body: parsed.data.department ? `An update for ${parsed.data.department}.` : "A new update from the People team.",
    link: "/portal/updates",
  });
  return NextResponse.json({ update: data }, { status: 201 });
}
