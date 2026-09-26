import { NextResponse } from "next/server";
import { processFeedback } from "@/lib/pipeline";
import { getHrUser } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await processFeedback(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.processing_status === "failed")
    return NextResponse.json({ error: "Analysis failed again — try later", feedback: row }, { status: 502 });
  return NextResponse.json({ feedback: row });
}
