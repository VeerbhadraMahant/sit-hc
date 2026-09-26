import { describe, expect, it } from "vitest";
import {
  departmentGroups,
  enps,
  questionStats,
  SURVEY_TEMPLATES,
  SurveyInputSchema,
  validateAnswers,
} from "@/lib/surveys";
import type { SurveyAnswers, SurveyQuestion } from "@/lib/types";

const questions: SurveyQuestion[] = [
  { id: "a", type: "enps", prompt: "Recommend?" },
  { id: "b", type: "scale", prompt: "Valued?" },
  { id: "c", type: "choice", prompt: "Days?", options: ["1", "2", "3"] },
  { id: "d", type: "text", prompt: "Anything else?", optional: true },
  { id: "e", type: "text", prompt: "Required text" },
];

describe("validateAnswers", () => {
  it("accepts valid answers and drops empty optional text", () => {
    const r = validateAnswers(questions, { a: 9, b: 4, c: "2", d: "", e: "More focus time" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answers).toEqual({ a: 9, b: 4, c: "2", e: "More focus time" });
  });

  it("rejects out-of-range numbers, unknown options, missing required and unknown keys", () => {
    expect(validateAnswers(questions, { a: 11, b: 4, c: "2", e: "x" }).ok).toBe(false);
    expect(validateAnswers(questions, { a: 5, b: 0, c: "2", e: "x" }).ok).toBe(false);
    expect(validateAnswers(questions, { a: 5, b: 3, c: "9", e: "x" }).ok).toBe(false);
    expect(validateAnswers(questions, { a: 5, b: 3, c: "1" }).ok).toBe(false);
    expect(validateAnswers(questions, { a: 5, b: 3, c: "1", e: "x", z: 1 }).ok).toBe(false);
    expect(validateAnswers(questions, { a: 5.5, b: 3, c: "1", e: "x" }).ok).toBe(false);
  });
});

describe("enps", () => {
  it("computes %promoters − %detractors", () => {
    // 4 promoters (9,10,9,10), 2 passives (7,8), 4 detractors (0,3,6,5) → (4-4)/10 = 0
    expect(enps([9, 10, 9, 10, 7, 8, 0, 3, 6, 5])).toMatchObject({ promoters: 4, passives: 2, detractors: 4, score: 0 });
    expect(enps([10, 10, 9]).score).toBe(100);
    expect(enps([0, 6]).score).toBe(-100);
    expect(enps([9, 7, 7]).score).toBe(33);
    expect(enps([]).score).toBeNull();
  });
});

describe("questionStats", () => {
  it("builds distributions", () => {
    const rs: { answers: SurveyAnswers }[] = [{ answers: { b: 5, c: "1" } }, { answers: { b: 3, c: "1" } }, { answers: { b: 5 } }];
    const scale = questionStats(questions[1], rs);
    expect(scale).toMatchObject({ type: "scale", n: 3, counts: [0, 0, 1, 0, 2] });
    if (scale.type === "scale") expect(scale.avg).toBeCloseTo(13 / 3);
    const choice = questionStats(questions[2], rs);
    expect(choice).toMatchObject({ n: 2, counts: [{ option: "1", count: 2 }, { option: "2", count: 0 }, { option: "3", count: 0 }] });
  });
});

describe("departmentGroups", () => {
  it("hides departments under 5 and folds them into Other", () => {
    const rs = [
      ...Array.from({ length: 6 }, () => ({ department: "Engineering" })),
      ...Array.from({ length: 3 }, () => ({ department: "Sales" })),
      ...Array.from({ length: 2 }, () => ({ department: "Design" })),
    ];
    const { groups, hiddenCount } = departmentGroups(rs);
    expect(groups.map((g) => [g.department, g.responses.length])).toEqual([
      ["Engineering", 6],
      ["Other", 5],
    ]);
    expect(hiddenCount).toBe(0);
    expect(departmentGroups(rs.slice(0, 9)).hiddenCount).toBe(3);
  });
});

describe("templates", () => {
  it("are valid survey inputs", () => {
    for (const t of SURVEY_TEMPLATES) {
      expect(SurveyInputSchema.safeParse({ title: t.title, description: t.description, questions: t.questions }).success).toBe(true);
    }
  });
});
