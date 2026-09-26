// Pure survey logic shared by the builder, APIs, results pages, seed script and tests.
// No "server-only" imports here.
import { z } from "zod";
import type { SurveyAnswers, SurveyQuestion } from "@/lib/types";

// ── Question & survey schemas ───────────────────────────────────

const id = z.string().trim().min(1).max(40);
const prompt = z.string().trim().min(3, "Each question needs a prompt.").max(300);

export const QuestionSchema = z.discriminatedUnion("type", [
  z.object({
    id,
    type: z.literal("scale"),
    prompt,
    min_label: z.string().trim().max(40).optional(),
    max_label: z.string().trim().max(40).optional(),
  }),
  z.object({ id, type: z.literal("enps"), prompt }),
  z.object({
    id,
    type: z.literal("choice"),
    prompt,
    options: z
      .array(z.string().trim().min(1).max(80))
      .min(2, "Choice questions need at least 2 options.")
      .max(8)
      .refine((o) => new Set(o).size === o.length, "Options must be unique."),
  }),
  z.object({ id, type: z.literal("text"), prompt, optional: z.boolean().optional() }),
]);

export const SurveyInputSchema = z.object({
  title: z.string().trim().min(3, "Give the survey a title.").max(140),
  description: z.string().trim().max(600).nullish(),
  questions: z
    .array(QuestionSchema)
    .min(1, "Add at least one question.")
    .max(15)
    .refine((qs) => new Set(qs.map((q) => q.id)).size === qs.length, "Question ids must be unique."),
  closes_at: z.string().datetime({ offset: true }).nullish(),
});
export type SurveyInput = z.infer<typeof SurveyInputSchema>;

/** Validates one employee's answers against the survey's questions. Unknown keys are rejected. */
export function buildAnswersSchema(questions: SurveyQuestion[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const q of questions) {
    switch (q.type) {
      case "scale":
        shape[q.id] = z.number().int().min(1).max(5);
        break;
      case "enps":
        shape[q.id] = z.number().int().min(0).max(10);
        break;
      case "choice":
        shape[q.id] = z.enum(q.options as [string, ...string[]]);
        break;
      case "text":
        shape[q.id] = q.optional
          ? z.string().trim().max(2000).optional()
          : z.string().trim().min(1, "Please answer every required question.").max(2000);
        break;
    }
  }
  return z.object(shape).strict();
}

export function validateAnswers(questions: SurveyQuestion[], answers: unknown) {
  const result = buildAnswersSchema(questions).safeParse(answers);
  if (!result.success) return { ok: false as const, error: result.error.issues[0]?.message ?? "Invalid answers." };
  // Drop empty optional text answers.
  const clean: SurveyAnswers = {};
  for (const [k, v] of Object.entries(result.data as Record<string, unknown>)) {
    if (v === undefined || v === "") continue;
    clean[k] = v as number | string;
  }
  return { ok: true as const, answers: clean };
}

// ── Stats ───────────────────────────────────────────────────────

export type EnpsBreakdown = {
  n: number;
  promoters: number;
  passives: number;
  detractors: number;
  /** % promoters (9–10) − % detractors (0–6), rounded, range −100…100. null when n = 0. */
  score: number | null;
};

export function enps(values: number[]): EnpsBreakdown {
  const n = values.length;
  const promoters = values.filter((v) => v >= 9).length;
  const detractors = values.filter((v) => v <= 6).length;
  const passives = n - promoters - detractors;
  return {
    n,
    promoters,
    passives,
    detractors,
    score: n ? Math.round(((promoters - detractors) / n) * 100) : null,
  };
}

export const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export type QuestionStats =
  | { type: "scale"; n: number; avg: number | null; counts: number[] } // counts[0] = score 1
  | { type: "enps"; n: number; avg: number | null; counts: number[]; enps: EnpsBreakdown } // counts[0] = score 0
  | { type: "choice"; n: number; counts: { option: string; count: number }[] }
  | { type: "text"; n: number; answers: string[] };

export function questionStats(q: SurveyQuestion, responses: { answers: SurveyAnswers }[]): QuestionStats {
  const raw = responses.map((r) => r.answers?.[q.id]).filter((v) => v !== undefined && v !== null && v !== "");
  switch (q.type) {
    case "scale": {
      const nums = raw.map(Number).filter((v) => Number.isInteger(v) && v >= 1 && v <= 5);
      const counts = [1, 2, 3, 4, 5].map((s) => nums.filter((v) => v === s).length);
      return { type: "scale", n: nums.length, avg: mean(nums), counts };
    }
    case "enps": {
      const nums = raw.map(Number).filter((v) => Number.isInteger(v) && v >= 0 && v <= 10);
      const counts = Array.from({ length: 11 }, (_, s) => nums.filter((v) => v === s).length);
      return { type: "enps", n: nums.length, avg: mean(nums), counts, enps: enps(nums) };
    }
    case "choice": {
      const strs = raw.map(String);
      const counts = q.options.map((option) => ({ option, count: strs.filter((v) => v === option).length }));
      return { type: "choice", n: strs.length, counts };
    }
    case "text":
      return { type: "text", n: raw.length, answers: raw.map(String) };
  }
}

export const K_ANON_MIN = 5;

/**
 * Groups responses by department, folding departments with fewer than K_ANON_MIN
 * responses into "Other" (itself hidden if still too small).
 */
export function departmentGroups<T extends { department: string | null }>(responses: T[]) {
  const byDept = new Map<string, T[]>();
  for (const r of responses) {
    const key = r.department || "Unspecified";
    byDept.set(key, [...(byDept.get(key) ?? []), r]);
  }
  const shown: { department: string; responses: T[] }[] = [];
  const other: T[] = [];
  for (const [department, rs] of byDept) {
    if (rs.length >= K_ANON_MIN) shown.push({ department, responses: rs });
    else other.push(...rs);
  }
  shown.sort((a, b) => b.responses.length - a.responses.length);
  const hiddenCount = other.length >= K_ANON_MIN ? 0 : other.length;
  if (other.length >= K_ANON_MIN) shown.push({ department: "Other", responses: other });
  return { groups: shown, hiddenCount };
}

// ── CSV ─────────────────────────────────────────────────────────

/** Quote + neutralise spreadsheet formula injection. */
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

// ── Templates ───────────────────────────────────────────────────

export const newQuestionId = () => `q_${Math.random().toString(36).slice(2, 8)}`;

export const SURVEY_TEMPLATES: { key: string; title: string; description: string; questions: SurveyQuestion[] }[] = [
  {
    key: "enps",
    title: "Quarterly eNPS",
    description: "A two-minute check on how likely you are to recommend working here, and why.",
    questions: [
      { id: "q_enps", type: "enps", prompt: "How likely are you to recommend this company as a place to work?" },
      { id: "q_valued", type: "scale", prompt: "I feel valued for the work I do.", min_label: "Strongly disagree", max_label: "Strongly agree" },
      { id: "q_change", type: "text", prompt: "What is the one thing we should change to make this a better place to work?", optional: true },
    ],
  },
  {
    key: "manager",
    title: "Manager effectiveness",
    description: "Help us understand how well managers are supporting their teams. Answers are anonymous.",
    questions: [
      { id: "q_clear", type: "scale", prompt: "My manager sets clear goals and priorities.", min_label: "Strongly disagree", max_label: "Strongly agree" },
      { id: "q_feedback", type: "scale", prompt: "My manager gives me useful feedback regularly.", min_label: "Strongly disagree", max_label: "Strongly agree" },
      { id: "q_growth", type: "scale", prompt: "My manager supports my career growth.", min_label: "Strongly disagree", max_label: "Strongly agree" },
      { id: "q_1on1", type: "choice", prompt: "How often do you have 1:1s with your manager?", options: ["Weekly", "Every two weeks", "Monthly", "Rarely or never"] },
      { id: "q_more", type: "text", prompt: "What could your manager do more of, or less of?", optional: true },
    ],
  },
  {
    key: "hybrid",
    title: "Hybrid work pulse",
    description: "Tell us how the hybrid policy is working for you and your team.",
    questions: [
      { id: "q_policy", type: "scale", prompt: "The hybrid work policy is clear to me.", min_label: "Not at all", max_label: "Completely" },
      { id: "q_days", type: "choice", prompt: "How many office days per week work best for you?", options: ["1 day", "2 days", "3 days", "Fully flexible"] },
      { id: "q_home", type: "scale", prompt: "I have what I need to work well from home.", min_label: "Not at all", max_label: "Completely" },
      { id: "q_idea", type: "text", prompt: "Anything else about hybrid work we should know?", optional: true },
    ],
  },
  {
    key: "burnout",
    title: "Burnout check",
    description: "A short, anonymous check on workload and energy. Results are only shown for groups of 5 or more.",
    questions: [
      { id: "q_workload", type: "scale", prompt: "My workload is manageable.", min_label: "Strongly disagree", max_label: "Strongly agree" },
      { id: "q_disconnect", type: "scale", prompt: "I can switch off from work outside working hours.", min_label: "Never", max_label: "Always" },
      { id: "q_energy", type: "scale", prompt: "How would you rate your energy at work over the last two weeks?", min_label: "Drained", max_label: "Energised" },
      { id: "q_cause", type: "choice", prompt: "What drains your energy the most?", options: ["Meetings", "On-call / after-hours work", "Unclear priorities", "Workload", "Something else"] },
      { id: "q_help", type: "text", prompt: "What would help you most right now?", optional: true },
    ],
  },
];
