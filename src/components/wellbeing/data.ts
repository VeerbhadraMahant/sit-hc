import "server-only";
import { createClient } from "@/lib/supabase/server";

export type WellbeingRow = {
  week: string;
  department: string | null;
  respondents: number;
  avg_mood: number;
  avg_energy: number;
};

export type Wellbeing = {
  /** Org-wide rows (department null), oldest → newest; weeks with <5 people are absent. */
  org: WellbeingRow[];
  /** Department rows for the latest week that has any department data (each ≥5 people). */
  departments: WellbeingRow[];
  departmentsWeek: string | null;
  latest: WellbeingRow | null;
  previous: WellbeingRow | null;
};

import { getDemoWellbeing } from "@/lib/demo-fallback";

/** HR-only aggregates via the security-definer RPC (it returns nothing for non-HR callers). */
export async function getWellbeing(weeks = 8): Promise<Wellbeing> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return getDemoWellbeing();
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("wellbeing_aggregates", { weeks });
    if (error) {
      console.warn("[wellbeing] RPC error, falling back to demo wellbeing:", error.message);
      return getDemoWellbeing();
    }
    const rows = ((data ?? []) as WellbeingRow[]).map((r) => ({
      ...r,
      avg_mood: Number(r.avg_mood),
      avg_energy: Number(r.avg_energy),
      respondents: Number(r.respondents),
    }));
    const org = rows.filter((r) => r.department === null).sort((a, b) => a.week.localeCompare(b.week));
    const deptRows = rows.filter((r) => r.department !== null);
    const departmentsWeek = deptRows.map((r) => r.week).sort().at(-1) ?? null;
    const departments = deptRows
      .filter((r) => r.week === departmentsWeek)
      .sort((a, b) => a.avg_mood - b.avg_mood);
    return {
      org,
      departments,
      departmentsWeek,
      latest: org.at(-1) ?? null,
      previous: org.at(-2) ?? null,
    };
  } catch (err) {
    console.warn("[wellbeing] exception, falling back to demo wellbeing:", err);
    return getDemoWellbeing();
  }
}
