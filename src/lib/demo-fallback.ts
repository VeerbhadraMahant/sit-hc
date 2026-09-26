import { SEED_ITEMS, type SeedItem } from "../../scripts/seed-data";
import type { FeedbackFilters, ListRow, AggRow } from "@/lib/dashboard-data";
import type { FeedbackRow, RiskFlag, Sentiment, Urgency } from "@/lib/types";

const DAY = 86_400_000;

function seededDate(weeksAgo: number, idx: number): string {
  const now = Date.now();
  const dayOffset = weeksAgo * 7 + (idx % 6);
  const t = new Date(now - dayOffset * DAY);
  t.setHours(9 + (idx % 8), (idx * 17) % 60, 0, 0);
  return t.toISOString();
}

function itemToRow(item: SeedItem, index: number): FeedbackRow {
  const created = seededDate(item.weeksAgo, index);
  return {
    id: `fb-seed-${index + 1}`,
    created_at: created,
    tracking_code: `VOC-${String(1000 + index).slice(1)}-${String(5000 + index).slice(1)}`,
    channel: item.channel === "voice" ? "voice" : "text",
    language: item.language ?? "English",
    redacted_text: item.text,
    department: item.dept,
    category: item.category ?? (item.urgency === "critical" ? "Report an issue" : "Concern"),
    is_anonymous: !item.identified,
    submitter_name: item.identified?.name ?? null,
    submitter_email: item.identified?.email ?? null,
    status: item.status ?? (item.weeksAgo >= 6 ? "closed" : item.weeksAgo >= 3 ? "in_review" : "new"),
    hr_response: item.response ?? null,
    responded_at: item.response ? new Date(new Date(created).getTime() + DAY).toISOString() : null,
    processing_status: "done",
    processing_error: null,
    sentiment: item.sentiment as Sentiment,
    sentiment_score: item.score,
    emotions: item.emotions,
    themes: item.themes,
    sub_topic: null,
    summary: item.summary,
    urgency: item.urgency as Urgency,
    risk_flags: (item.flags ?? []) as RiskFlag[],
    suggested_action: item.action,
  };
}

export const DEMO_FEEDBACK_ROWS: FeedbackRow[] = SEED_ITEMS.map((item, idx) => itemToRow(item, idx));

export function getDemoAggRows(sinceIso: string): AggRow[] {
  const sinceTime = new Date(sinceIso).getTime();
  return DEMO_FEEDBACK_ROWS.filter((r) => new Date(r.created_at).getTime() >= sinceTime) as unknown as AggRow[];
}

export function getDemoPreviousScores(fromIso: string, toIso: string): (number | null)[] {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return DEMO_FEEDBACK_ROWS.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= from && t < to;
  }).map((r) => r.sentiment_score);
}

export function getDemoFeedbackPage(
  f: FeedbackFilters,
  page = 1,
  pageSize = 100,
): { rows: ListRow[]; total: number; page: number; hasMore: boolean } {
  let list = DEMO_FEEDBACK_ROWS;
  if (f.department) list = list.filter((r) => r.department === f.department);
  if (f.theme) list = list.filter((r) => r.themes?.includes(f.theme!));
  if (f.sentiment) list = list.filter((r) => r.sentiment === f.sentiment);
  if (f.urgency) list = list.filter((r) => r.urgency === f.urgency);
  if (f.status) list = list.filter((r) => r.status === f.status);
  if (f.channel) list = list.filter((r) => r.channel === f.channel);
  if (f.days) {
    const cutoff = Date.now() - f.days * DAY;
    list = list.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  }
  if (f.q) {
    const term = f.q.toLowerCase().trim();
    list = list.filter(
      (r) =>
        r.summary?.toLowerCase().includes(term) ||
        r.redacted_text?.toLowerCase().includes(term) ||
        r.tracking_code?.toLowerCase().includes(term),
    );
  }

  const safePage = Math.max(1, Math.floor(page) || 1);
  const from = (safePage - 1) * pageSize;
  const rows = list.slice(from, from + pageSize) as unknown as ListRow[];
  return {
    rows,
    total: list.length,
    page: safePage,
    hasMore: from + pageSize < list.length,
  };
}

export function getDemoFeedbackDetail(id: string): {
  feedback: FeedbackRow | null;
  notes: { id: string; created_at: string; author_name: string | null; body: string }[];
} {
  const fb = DEMO_FEEDBACK_ROWS.find((r) => r.id === id || r.tracking_code === id) ?? DEMO_FEEDBACK_ROWS[0] ?? null;
  const notes = fb?.urgency === "critical"
    ? [
        {
          id: "note-1",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          author_name: "Priya Sharma (HR)",
          body: "Acknowledged emergency risk flag. Triggered workplace safety escalation protocol and scheduled confidential intake.",
        },
      ]
    : [];
  return { feedback: fb, notes };
}

export function getDemoWellbeing() {
  const org = [
    { week: "2026-08-03", department: null, respondents: 24, avg_mood: 3.7, avg_energy: 3.2 },
    { week: "2026-08-17", department: null, respondents: 26, avg_mood: 3.65, avg_energy: 3.35 },
    { week: "2026-08-31", department: null, respondents: 25, avg_mood: 3.6, avg_energy: 3.5 },
    { week: "2026-09-14", department: null, respondents: 22, avg_mood: 3.15, avg_energy: 3.05 },
    { week: "2026-09-21", department: null, respondents: 21, avg_mood: 3.3, avg_energy: 3.1 },
  ];
  const departments = [
    { week: "2026-09-21", department: "Engineering", respondents: 8, avg_mood: 2.8, avg_energy: 2.7 },
    { week: "2026-09-21", department: "Customer Support", respondents: 5, avg_mood: 3.2, avg_energy: 3.0 },
    { week: "2026-09-21", department: "Sales", respondents: 6, avg_mood: 3.4, avg_energy: 3.3 },
  ];
  return {
    org,
    departments,
    departmentsWeek: "2026-09-21",
    latest: org[org.length - 1],
    previous: org[org.length - 2],
  };
}

export const DEMO_INSIGHT_REPORTS = [
  {
    id: "report-demo-1",
    created_at: new Date(Date.now() - 2 * DAY).toISOString(),
    period_start: new Date(Date.now() - 30 * DAY).toISOString(),
    period_end: new Date().toISOString(),
    department: null,
    feedback_count: 47,
    headline: "Engineering On-Call Crunch & Critical Facilities Safety Flags Dominate Monthly Sentiment",
    executive_summary:
      "Across 47 verified employee submissions this month, two acute hotspots require immediate leadership intervention: escalating on-call alert fatigue and burnout within Engineering, alongside two high-severity workplace safety/facilities violations reported in Operations. General sentiment remains steady in Support and Sales.",
    top_concerns: [
      {
        title: "Severe On-Call Burnout & Night Escalations",
        description:
          "Engineers report sustained 3 AM pages for non-critical alerts during sprint crunches, with several senior ICs voicing attrition intentions.",
        theme: "Workload & Burnout",
        severity: "critical" as Urgency,
        departments: ["Engineering"],
        mention_count: 6,
        evidence_ids: ["fb-seed-11", "fb-seed-12"],
      },
      {
        title: "Second-Floor Fire Exit Routinely Obstructed",
        description:
          "Blocked emergency exits and missed annual fire evacuation drills in Operations warehouse facility.",
        theme: "Workplace Safety",
        severity: "critical" as Urgency,
        departments: ["Operations"],
        mention_count: 3,
        evidence_ids: ["fb-seed-22", "fb-seed-24"],
      },
      {
        title: "Sales Commission Plan Ambiguity",
        description:
          "Recent restructuring of quarterly quota tiers generated confusion regarding retro-active clawbacks.",
        theme: "Compensation & Benefits",
        severity: "high" as Urgency,
        departments: ["Sales"],
        mention_count: 4,
        evidence_ids: ["fb-seed-15"],
      },
    ],
    positives: [
      {
        title: "Modern Helpdesk Tooling Rollout Praised",
        description:
          "Customer Support teams highlighted significant workflow speedups and reduced repetitive ticketing overhead.",
      },
      {
        title: "Staff Engineer Career Ladder Clarity",
        description:
          "Engineers commended the explicit promotion milestones and transparent expectations.",
      },
    ],
    action_items: [
      {
        title: "Immediate Alert Noise Audit & Rotation Expansion",
        description:
          "Platform team to suppress self-healing alerts and scale the on-call pool from 5 to 8 engineers.",
        priority: "P1" as const,
        owner: "Engineering VP",
        timeframe: "Next 7 days",
        expected_impact: "Halve off-hours pages and prevent senior attrition",
      },
      {
        title: "Urgent Facility Safety Inspection",
        description:
          "Clear all secondary emergency exits and schedule mandatory Q3 evacuation exercise.",
        priority: "P1" as const,
        owner: "Facilities Director",
        timeframe: "Immediate (48h)",
        expected_impact: "Full regulatory compliance and employee physical safety",
      },
      {
        title: "Sales Comp Plan All-Hands Q&A",
        description:
          "Distribute an FAQ document with worked tier examples and host open office hours.",
        priority: "P2" as const,
        owner: "Head of Revenue Operations",
        timeframe: "Next 2 weeks",
        expected_impact: "Clear incentive alignment and quota trust",
      },
    ],
  },
];

