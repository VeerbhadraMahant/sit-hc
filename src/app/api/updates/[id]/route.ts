import { NextResponse } from "next/server";
import { createClient, getHrUser } from "@/lib/supabase/server";
import { UPDATE_COLUMNS, UpdateInputSchema } from "@/components/updates/schema";

/** HR: edit an update (no re-notification). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getHrUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = UpdateInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("updates")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      theme: parsed.data.theme ?? null,
      department: parsed.data.department || null,
      feedback_count: parsed.data.feedback_count ?? null,
    } as never)
    .eq("id", id)
    .select(UPDATE_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Update not found" }, { status: 404 });
  return NextResponse.json({ update: data });
}

/** HR: delete an update. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getHrUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { error, count } = await supabase.from("updates").delete({ count: "exact" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!count) return NextResponse.json({ error: "Update not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
