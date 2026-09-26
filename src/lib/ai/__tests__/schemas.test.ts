import { describe, expect, it } from "vitest";
import { AnalysisSchema, AnswerSchema, InsightSchema, TranscriptSchema, toGeminiSchema } from "../schemas";

const validAnalysis = {
  language: "Hindi",
  redacted_text: "My manager [NAME] keeps adding scope mid-sprint.",
  summary: "Scope is added mid-sprint by the manager.",
  sentiment: "negative",
  sentiment_score: -0.6,
  emotions: ["frustrated"],
  themes: ["Workload & Burnout", "Management & Leadership"],
  urgency: "high",
  risk_flags: ["burnout"],
  suggested_action: "Review sprint scope-change policy with the engineering manager.",
};

describe("AnalysisSchema", () => {
  it("accepts a valid analysis", () => {
    expect(AnalysisSchema.parse(validAnalysis)).toEqual(validAnalysis);
  });

  it("rejects unknown enums", () => {
    expect(AnalysisSchema.safeParse({ ...validAnalysis, sentiment: "angry" }).success).toBe(false);
    expect(AnalysisSchema.safeParse({ ...validAnalysis, urgency: "urgent" }).success).toBe(false);
    expect(AnalysisSchema.safeParse({ ...validAnalysis, themes: ["Pizza"] }).success).toBe(false);
    expect(AnalysisSchema.safeParse({ ...validAnalysis, risk_flags: ["lawsuit"] }).success).toBe(false);
  });

  it("enforces score range and theme count", () => {
    expect(AnalysisSchema.safeParse({ ...validAnalysis, sentiment_score: -1.5 }).success).toBe(false);
    expect(AnalysisSchema.safeParse({ ...validAnalysis, themes: [] }).success).toBe(false);
  });
});

describe("InsightSchema", () => {
  const report = {
    headline: "Engineering burnout is the top risk this month",
    executive_summary: "Sentiment dipped as on-call load grew.",
    top_concerns: [
      {
        title: "On-call overload",
        description: "Five engineers carry most pages.",
        theme: "Workload & Burnout",
        severity: "high",
        departments: ["Engineering"],
        mention_count: 12,
        evidence_ids: ["F1", "F4"],
      },
    ],
    positives: [{ title: "Support tooling", description: "CSAT up after new helpdesk." }],
    action_items: [
      {
        title: "Expand on-call rotation",
        description: "Grow rotation from 5 to 8.",
        root_cause: "Five engineers carry most pages.",
        priority: "P1",
        owner: "Engineering leadership",
        timeframe: "This week",
        expected_impact: "Fewer night pages per person",
        evidence_ids: ["F1", "F4"],
      },
    ],
  };

  it("accepts a valid report", () => {
    expect(InsightSchema.safeParse(report).success).toBe(true);
  });

  it("rejects bad priority and severity", () => {
    expect(
      InsightSchema.safeParse({ ...report, action_items: [{ ...report.action_items[0], priority: "P0" }] }).success,
    ).toBe(false);
    expect(
      InsightSchema.safeParse({ ...report, top_concerns: [{ ...report.top_concerns[0], severity: "severe" }] }).success,
    ).toBe(false);
  });
});

describe("AnswerSchema and TranscriptSchema", () => {
  it("accept valid payloads", () => {
    expect(AnswerSchema.safeParse({ answer: "Yes [F1]", cited: ["F1"], follow_ups: [] }).success).toBe(true);
    expect(TranscriptSchema.safeParse({ transcript: "hello", language: "English" }).success).toBe(true);
  });

  it("limits follow-ups to three", () => {
    expect(AnswerSchema.safeParse({ answer: "x", cited: [], follow_ups: ["a", "b", "c", "d"] }).success).toBe(false);
  });
});

describe("toGeminiSchema", () => {
  it("drops $schema and keeps enum constraints", () => {
    const json = toGeminiSchema(AnalysisSchema) as {
      $schema?: string;
      type: string;
      properties: Record<string, { enum?: string[] }>;
    };
    expect(json.$schema).toBeUndefined();
    expect(json.type).toBe("object");
    expect(json.properties.sentiment.enum).toContain("negative");
    expect(json.properties.urgency.enum).toEqual(["low", "medium", "high", "critical"]);
  });
});
