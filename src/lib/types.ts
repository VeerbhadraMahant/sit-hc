export const SENTIMENTS = ["positive", "neutral", "mixed", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const URGENCIES = ["low", "medium", "high", "critical"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const STATUSES = ["new", "in_review", "actioned", "closed"] as const;
export type FeedbackStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "Received",
  in_review: "In review",
  actioned: "Action taken",
  closed: "Closed",
};

export const RISK_FLAGS = [
  "harassment",
  "discrimination",
  "burnout",
  "attrition_risk",
  "safety",
  "ethics",
  "mental_health",
] as const;
export type RiskFlag = (typeof RISK_FLAGS)[number];

export const RISK_LABELS: Record<RiskFlag, string> = {
  harassment: "Harassment",
  discrimination: "Discrimination",
  burnout: "Burnout",
  attrition_risk: "Attrition risk",
  safety: "Safety",
  ethics: "Ethics",
  mental_health: "Mental health",
};

/** Canonical theme taxonomy. The model must map feedback into these. */
export const THEMES = [
  "Workload & Burnout",
  "Management & Leadership",
  "Compensation & Benefits",
  "Career Growth",
  "Work-Life Balance",
  "Team Culture",
  "Communication",
  "Tools & Resources",
  "Recognition",
  "Remote & Hybrid Work",
  "Workplace Safety",
  "Diversity & Inclusion",
  "Onboarding & Training",
  "Facilities",
  "Other",
] as const;
export type Theme = (typeof THEMES)[number];

export const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Customer Support",
  "Operations",
  "Finance",
  "People & HR",
] as const;

export const CATEGORIES = ["General", "Suggestion", "Concern", "Appreciation", "Report an issue"] as const;

export type ProcessingStatus = "pending" | "done" | "failed";

export interface FeedbackRow {
  id: string;
  created_at: string;
  tracking_code: string;
  channel: "text" | "voice";
  language: string | null;
  raw_text: string | null;
  redacted_text: string | null;
  department: string | null;
  category: string | null;
  is_anonymous: boolean;
  submitter_name: string | null;
  submitter_email: string | null;
  status: FeedbackStatus;
  hr_response: string | null;
  responded_at: string | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  sentiment: Sentiment | null;
  sentiment_score: number | null;
  emotions: string[] | null;
  themes: string[] | null;
  summary: string | null;
  urgency: Urgency | null;
  risk_flags: RiskFlag[] | null;
  suggested_action: string | null;
}

/** Columns safe to select for the HR dashboard (no embeddings). */
export const FEEDBACK_COLUMNS =
  "id,created_at,tracking_code,channel,language,raw_text,redacted_text,department,category,is_anonymous,submitter_name,submitter_email,status,hr_response,responded_at,processing_status,processing_error,sentiment,sentiment_score,emotions,themes,summary,urgency,risk_flags,suggested_action";

export interface InsightReport {
  id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  department: string | null;
  feedback_count: number;
  headline: string;
  executive_summary: string;
  top_concerns: {
    title: string;
    description: string;
    theme: string;
    severity: Urgency;
    departments: string[];
    mention_count: number;
    evidence_ids: string[];
  }[];
  positives: { title: string; description: string }[];
  action_items: {
    title: string;
    description: string;
    priority: "P1" | "P2" | "P3";
    owner: string;
    timeframe: string;
    expected_impact: string;
  }[];
}
