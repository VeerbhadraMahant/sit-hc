import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_COLUMNS, type FeedbackRow, type RiskFlag } from "@/lib/types";

export const PERIODS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

export function parsePeriod(value: string | string[] | undefined): PeriodDays {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PERIODS as readonly number[]).includes(n) ? (n as PeriodDays) : 90;
}

const DAY = 86_400_000;

/** Monday (UTC) of the ISO week containing d, as YYYY-MM-DD. */
export function weekStart(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}

function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface Kpis {
  total: number;
  previousTotal: number;
  deltaPct: number | null;
  avgSentiment: number | null;
  previousAvgSentiment: number | null;
  pctNegative: number | null;
  openUrgent: number;
  responseRate: number | null;
  medianHoursToRespond: number | null;
}

export interface WeeklySentiment {
  week: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface ThemeStat {
  theme: string;
  count: number;
  avgSentiment: number | null;
}

export interface HeatCell {
  department: string;
  theme: string;
  count: number;
  avgSentiment: number | null;
}

export interface DeptStat {
  department: string;
  count: number;
  avgSentiment: number | null;
}

export interface Overview {
  periodDays: PeriodDays;
  kpis: Kpis;
  weekly: WeeklySentiment[];
  themes: ThemeStat[];
  departments: DeptStat[];
  heatmap: { departments: string[]; themes: string[]; cells: HeatCell[] };
  channels: { channel: string; count: number }[];
  risks: { flag: RiskFlag; count: number }[];
  emotions: { emotion: string; count: number }[];
  needsAttention: AggRow[];
}

/** Only what the overview aggregates need — no free text beyond the one-line summary, no PII. */
const AGG_COLUMNS =
  "id,created_at,department,channel,sentiment,sentiment_score,themes,emotions,urgency,status,risk_flags,responded_at,summary";

export type AggRow = Pick<
  FeedbackRow,
  | "id"
  | "created_at"
  | "department"
  | "channel"
  | "sentiment"
  | "sentiment_score"
  | "themes"
  | "emotions"
  | "urgency"
  | "status"
  | "risk_flags"
  | "responded_at"
  | "summary"
>;

import {
  getDemoAggRows,
  getDemoPreviousScores,
  getDemoFeedbackPage,
  getDemoFeedbackDetail,
} from "@/lib/demo-fallback";

async function fetchAggRows(sinceIso: string): Promise<AggRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return getDemoAggRows(sinceIso);
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feedback")
      .select(AGG_COLUMNS)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AggRow[];
  } catch (err) {
    console.warn("fetchAggRows falling back to demo seed data:", err);
    return getDemoAggRows(sinceIso);
  }
}

/** The previous period only feeds two KPI deltas: row count and average sentiment. */
async function fetchPreviousScores(fromIso: string, toIso: string): Promise<(number | null)[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return getDemoPreviousScores(fromIso, toIso);
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feedback")
      .select("sentiment_score")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .limit(5000);
    if (error) throw new Error(error.message);
    return ((data ?? []) as { sentiment_score: number | null }[]).map((r) => r.sentiment_score);
  } catch (err) {
    console.warn("fetchPreviousScores falling back to demo seed data:", err);
    return getDemoPreviousScores(fromIso, toIso);
  }
}

function countBy<T>(items: T[], key: (t: T) => string[] | string | null | undefined) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    const ks = Array.isArray(k) ? k : k ? [k] : [];
    for (const x of ks) m.set(x, (m.get(x) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export async function getOverview(periodDays: PeriodDays): Promise<Overview> {
  const now = Date.now();
  const start = now - periodDays * DAY;
  const prevStart = start - periodDays * DAY;
  const startIso = new Date(start).toISOString();
  const [rows, prevScores] = await Promise.all([
    fetchAggRows(startIso),
    fetchPreviousScores(new Date(prevStart).toISOString(), startIso),
  ]);

  const scored = rows.filter((r) => r.sentiment_score != null);
  const analysed = rows.filter((r) => r.sentiment);
  const responded = rows.filter((r) => r.responded_at);
  const responseHours = responded.map(
    (r) => (new Date(r.responded_at!).getTime() - new Date(r.created_at).getTime()) / 3_600_000,
  );

  const kpis: Kpis = {
    total: rows.length,
    previousTotal: prevScores.length,
    deltaPct: prevScores.length ? ((rows.length - prevScores.length) / prevScores.length) * 100 : null,
    avgSentiment: avg(scored.map((r) => r.sentiment_score!)),
    previousAvgSentiment: avg(prevScores.filter((x): x is number => x != null)),
    pctNegative: analysed.length ? (analysed.filter((r) => r.sentiment === "negative").length / analysed.length) * 100 : null,
    openUrgent: rows.filter(
      (r) => (r.urgency === "critical" || r.urgency === "high") && (r.status === "new" || r.status === "in_review"),
    ).length,
    responseRate: rows.length ? (responded.length / rows.length) * 100 : null,
    medianHoursToRespond: median(responseHours.filter((h) => h >= 0)),
  };

  // Weekly sentiment stacks — include every week in range, even empty ones.
  const weeks = new Map<string, WeeklySentiment>();
  for (let t = start; t <= now; t += 7 * DAY) {
    const w = weekStart(new Date(t));
    weeks.set(w, { week: w, positive: 0, neutral: 0, negative: 0, total: 0 });
  }
  const lastW = weekStart(new Date(now));
  if (!weeks.has(lastW)) weeks.set(lastW, { week: lastW, positive: 0, neutral: 0, negative: 0, total: 0 });
  for (const r of analysed) {
    const w = weekStart(new Date(r.created_at));
    const b = weeks.get(w);
    if (!b) continue;
    if (r.sentiment === "positive") b.positive++;
    else if (r.sentiment === "negative") b.negative++;
    else b.neutral++;
    b.total++;
  }
  const weekly = [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week));

  // Themes
  const themeMap = new Map<string, number[]>();
  for (const r of rows)
    for (const t of r.themes ?? []) {
      const arr = themeMap.get(t) ?? [];
      if (r.sentiment_score != null) arr.push(r.sentiment_score);
      else arr.push(NaN);
      themeMap.set(t, arr);
    }
  const themes: ThemeStat[] = [...themeMap.entries()]
    .map(([theme, xs]) => ({ theme, count: xs.length, avgSentiment: avg(xs.filter((x) => !Number.isNaN(x))) }))
    .sort((a, b) => b.count - a.count);

  // Departments
  const deptMap = new Map<string, AggRow[]>();
  for (const r of rows) {
    const d = r.department || "Unspecified";
    const bucket = deptMap.get(d);
    if (bucket) bucket.push(r);
    else deptMap.set(d, [r]);
  }
  const departments: DeptStat[] = [...deptMap.entries()]
    .map(([department, rs]) => ({
      department,
      count: rs.length,
      avgSentiment: avg(rs.filter((r) => r.sentiment_score != null).map((r) => r.sentiment_score!)),
    }))
    .sort((a, b) => b.count - a.count);

  // Heatmap: department × top 6 themes
  const heatThemes = themes.slice(0, 6).map((t) => t.theme);
  const heatDepts = departments.slice(0, 9).map((d) => d.department);
  const cells: HeatCell[] = [];
  for (const department of heatDepts)
    for (const theme of heatThemes) {
      const rs = (deptMap.get(department) ?? []).filter((r) => r.themes?.includes(theme));
      cells.push({
        department,
        theme,
        count: rs.length,
        avgSentiment: avg(rs.filter((r) => r.sentiment_score != null).map((r) => r.sentiment_score!)),
      });
    }

  const channels = countBy(rows, (r) => r.channel).map(([channel, count]) => ({ channel, count }));
  const risks = countBy(rows, (r) => r.risk_flags).map(([flag, count]) => ({ flag: flag as RiskFlag, count }));
  const emotions = countBy(rows, (r) => r.emotions?.map((e) => e.toLowerCase()))
    .slice(0, 14)
    .map(([emotion, count]) => ({ emotion, count }));

  const urgencyRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  const needsAttention = rows
    .filter((r) => (r.urgency === "critical" || r.urgency === "high") && (r.status === "new" || r.status === "in_review"))
    .sort(
      (a, b) =>
        urgencyRank[a.urgency!] - urgencyRank[b.urgency!] ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 8);

  return {
    periodDays,
    kpis,
    weekly,
    themes,
    departments,
    heatmap: { departments: heatDepts, themes: heatThemes, cells },
    channels,
    risks,
    emotions,
    needsAttention,
  };
}

export interface FeedbackFilters {
  q?: string;
  department?: string;
  theme?: string;
  sentiment?: string;
  urgency?: string;
  status?: string;
  channel?: string;
  days?: number;
}

export function readFilters(sp: Record<string, string | string[] | undefined>): FeedbackFilters {
  const one = (k: string) => {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s !== "all" ? s : undefined;
  };
  const days = Number(one("days"));
  return {
    q: one("q"),
    department: one("department"),
    theme: one("theme"),
    sentiment: one("sentiment"),
    urgency: one("urgency"),
    status: one("status"),
    channel: one("channel"),
    days: Number.isFinite(days) && days > 0 ? days : undefined,
  };
}

// Loose builder type: the untyped client's PostgREST generics are unwieldy to spell out.
type Filterable = {
  eq(column: string, value: unknown): Filterable;
  contains(column: string, value: unknown): Filterable;
  gte(column: string, value: unknown): Filterable;
  or(filters: string): Filterable;
};

function applyFilters<Q>(query: Q, f: FeedbackFilters): Q {
  let q = query as unknown as Filterable;
  if (f.department) q = q.eq("department", f.department);
  if (f.theme) q = q.contains("themes", [f.theme]);
  if (f.sentiment) q = q.eq("sentiment", f.sentiment);
  if (f.urgency) q = q.eq("urgency", f.urgency);
  if (f.status) q = q.eq("status", f.status);
  if (f.channel) q = q.eq("channel", f.channel);
  if (f.days) q = q.gte("created_at", new Date(Date.now() - f.days * DAY).toISOString());
  if (f.q) {
    // pg_trgm GIN indexes on summary + redacted_text back these ilike scans.
    const term = f.q.replace(/[%,()*]/g, " ").trim();
    if (term) q = q.or(`summary.ilike.*${term}*,redacted_text.ilike.*${term}*,tracking_code.ilike.*${term}*`);
  }
  return q as unknown as Q;
}

/** Full-column filtered list — used by the CSV export. */
export async function listFeedback(f: FeedbackFilters, limit = 500): Promise<FeedbackRow[]> {
  const supabase = await createClient();
  const q = applyFilters(
    supabase.from("feedback").select(FEEDBACK_COLUMNS).order("created_at", { ascending: false }).limit(limit),
    f,
  );
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FeedbackRow[];
}

export const INBOX_PAGE_SIZE = 100;

const LIST_COLUMNS = "id,created_at,tracking_code,channel,urgency,sentiment,processing_status,summary,department,themes,status,risk_flags";

export type ListRow = Pick<
  FeedbackRow,
  | "id"
  | "created_at"
  | "tracking_code"
  | "channel"
  | "urgency"
  | "sentiment"
  | "processing_status"
  | "summary"
  | "department"
  | "themes"
  | "status"
  | "risk_flags"
>;

/** One inbox page with only the columns the list renders (keeps the RSC payload small). */
export async function listFeedbackPage(
  f: FeedbackFilters,
  page = 1,
): Promise<{ rows: ListRow[]; total: number; page: number; hasMore: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return getDemoFeedbackPage(f, page, INBOX_PAGE_SIZE);
  }
  try {
    const supabase = await createClient();
    const safePage = Math.max(1, Math.floor(page) || 1);
    const from = (safePage - 1) * INBOX_PAGE_SIZE;
    const q = applyFilters(
      supabase
        .from("feedback")
        .select(LIST_COLUMNS, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + INBOX_PAGE_SIZE - 1),
      f,
    );
    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return { rows: (data ?? []) as unknown as ListRow[], total, page: safePage, hasMore: from + INBOX_PAGE_SIZE < total };
  } catch (err) {
    console.warn("listFeedbackPage falling back to demo seed data:", err);
    return getDemoFeedbackPage(f, page, INBOX_PAGE_SIZE);
  }
}

export async function getFeedbackDetail(id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return getDemoFeedbackDetail(id);
  }
  try {
    const supabase = await createClient();
    const [{ data: fb }, { data: notes }] = await Promise.all([
      supabase.from("feedback").select(FEEDBACK_COLUMNS).eq("id", id).maybeSingle(),
      supabase
        .from("feedback_notes")
        .select("id,created_at,author_name,body")
        .eq("feedback_id", id)
        .order("created_at", { ascending: true }),
    ]);
    return {
      feedback: (fb ?? null) as unknown as FeedbackRow | null,
      notes: (notes ?? []) as { id: string; created_at: string; author_name: string | null; body: string }[],
    };
  } catch (err) {
    console.warn("getFeedbackDetail falling back to demo seed data:", err);
    return getDemoFeedbackDetail(id);
  }
}
