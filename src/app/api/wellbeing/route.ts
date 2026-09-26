import { NextResponse } from "next/server";
import { getWellbeing } from "@/components/wellbeing/data";
import { getHrUser } from "@/lib/supabase/server";

/** HR: k-anonymous wellbeing aggregates (groups under 5 people are never returned). */
export async function GET(req: Request) {
  if (!(await getHrUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const weeks = Math.min(26, Math.max(1, Number(new URL(req.url).searchParams.get("weeks")) || 8));
  return NextResponse.json(await getWellbeing(weeks));
}
