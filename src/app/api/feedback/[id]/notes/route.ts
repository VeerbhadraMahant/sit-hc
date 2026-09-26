import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getHrUser } from "@/lib/supabase/server";

const NoteSchema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = NoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Note can't be empty" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback_notes")
    .insert({
      feedback_id: id,
      author_id: user.id,
      author_name: user.fullName ?? user.email ?? "HR",
      body: parsed.data.body,
    } as never)
    .select("id,created_at,author_name,body")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ note: data });
}
