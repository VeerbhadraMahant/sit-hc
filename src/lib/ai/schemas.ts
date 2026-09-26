import { z } from "zod";
import { RISK_FLAGS, SENTIMENTS, THEMES, URGENCIES } from "@/lib/types";

export const TranscriptSchema = z.object({
  transcript: z.string().describe("Verbatim transcript in the original spoken language"),
  language: z.string().describe("Language name in English, e.g. 'Hindi', 'English', 'Kannada'"),
});
export type Transcript = z.infer<typeof TranscriptSchema>;

export const AnalysisSchema = z.object({
  language: z.string().describe("Language the feedback was written or spoken in, e.g. 'English', 'Hindi'"),
  redacted_text: z
    .string()
    .describe(
      "The feedback translated to clear English (unchanged if already English), with personally identifying details replaced by [NAME], [EMAIL], [PHONE], [EMPLOYEE_ID], [LOCATION]. Preserve meaning, tone and all concrete issues.",
    ),
  summary: z.string().describe("One neutral sentence (max 25 words) capturing the core point for HR"),
  sentiment: z.enum(SENTIMENTS),
  sentiment_score: z.number().min(-1).max(1).describe("-1 very negative … 0 neutral … 1 very positive"),
  emotions: z.array(z.string()).max(4).describe("Up to 4 lowercase emotions, e.g. frustrated, anxious, grateful"),
  themes: z.array(z.enum(THEMES)).min(1).max(3).describe("1-3 themes from the fixed taxonomy, most relevant first"),
  urgency: z
    .enum(URGENCIES)
    .describe(
      "critical: harassment, discrimination, safety, self-harm or legal/ethics risk; high: burnout, imminent resignation, severe team dysfunction; medium: recurring friction; low: suggestions, praise, minor issues",
    ),
  risk_flags: z.array(z.enum(RISK_FLAGS)).describe("Only flags clearly supported by the text; empty if none"),
  suggested_action: z.string().describe("One concrete next step HR could take (max 30 words)"),
  sub_topic: z
    .string()
    .max(50)
    .optional()
    .describe(
      "A 2-4 word micro-issue label capturing the specific problem within the primary theme (e.g. 'Slow laptop performance', 'VPN disconnections', 'No 1:1 meetings'). Do NOT restate the theme name.",
    ),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const InsightSchema = z.object({
  headline: z.string().describe("A single-sentence headline for leadership, max 16 words"),
  executive_summary: z.string().describe("3-5 sentences: overall mood, what changed, the biggest risks and bright spots"),
  top_concerns: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().describe("2 sentences with specifics drawn from the feedback"),
        theme: z.enum(THEMES),
        severity: z.enum(URGENCIES),
        departments: z.array(z.string()),
        mention_count: z.number().int(),
        evidence_ids: z.array(z.string()).describe("Reference keys like F12 of the feedback items that support this"),
      }),
    )
    .max(5),
  positives: z.array(z.object({ title: z.string(), description: z.string() })).max(3),
  action_items: z
    .array(
      z.object({
        title: z.string().describe("Imperative, specific action"),
        description: z.string(),
        root_cause: z
          .string()
          .describe(
            "The one concrete detail from the feedback that this action responds to, stated plainly — e.g. '3 engineers reported working 3 straight on-call weekends' — not a restatement of the action itself.",
          ),
        priority: z.enum(["P1", "P2", "P3"]),
        owner: z.string().describe("Accountable role or team, e.g. 'Engineering leadership', 'HRBP – Sales'"),
        timeframe: z.string().describe("e.g. 'This week', 'Within 30 days', 'This quarter'"),
        expected_impact: z.string(),
        evidence_ids: z.array(z.string()).describe("Reference keys like F12 of the feedback items behind root_cause"),
      }),
    )
    .max(6),
});
export type Insight = z.infer<typeof InsightSchema>;

export const AnswerSchema = z.object({
  answer: z
    .string()
    .describe("Markdown answer for an HR professional. Cite supporting feedback inline like [F3]. Be specific and concise."),
  cited: z.array(z.string()).describe("Reference keys (e.g. F3) cited in the answer"),
  follow_ups: z.array(z.string()).max(3).describe("Up to 3 short follow-up questions HR might ask next"),
});
export type Answer = z.infer<typeof AnswerSchema>;

/** Zod → JSON Schema accepted by Gemini's responseJsonSchema. */
export function toGeminiSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}
