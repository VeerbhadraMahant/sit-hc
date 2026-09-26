export type HighlightType = "negative" | "attention" | "positive";

export interface HighlightSpan {
  text: string;
  type: HighlightType;
  label?: string;
}

export interface FeedbackCardData {
  id: string;
  authorName: string;
  authorInitials: string;
  authorBg: string;
  department: string;
  channel: "text" | "voice" | "ocr";
  text: string;
  highlights: HighlightSpan[];
  sentiment: "positive" | "negative" | "mixed" | "neutral";
  urgency: "low" | "medium" | "high" | "critical";
  theme: string;
  tiltClass?: string;
}

export interface TextSegment {
  text: string;
  isHighlight: boolean;
  type?: HighlightType;
  label?: string;
}

export interface PretokenizedCard extends FeedbackCardData {
  segments: TextSegment[];
  responsiveVisibility: string;
}

/**
 * Tokenizes text into alternating plain and highlighted segments.
 * Preserves the exact character sequence, whitespace, and punctuation.
 */
export function tokenizeHighlightedText(
  fullText: string,
  highlights: HighlightSpan[]
): TextSegment[] {
  if (!highlights || highlights.length === 0) {
    return [{ text: fullText, isHighlight: false }];
  }

  interface Match {
    start: number;
    end: number;
    highlight: HighlightSpan;
  }

  const matches: Match[] = [];
  const lowerFull = fullText.toLowerCase();

  for (const h of highlights) {
    if (!h.text) continue;
    const lowerSearch = h.text.toLowerCase();
    let startIndex = 0;

    while (startIndex < fullText.length) {
      const idx = lowerFull.indexOf(lowerSearch, startIndex);
      if (idx === -1) break;
      matches.push({
        start: idx,
        end: idx + h.text.length,
        highlight: h,
      });
      startIndex = idx + h.text.length;
    }
  }

  // Sort matches by start index; for same start, pick longer match
  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  // Filter overlapping matches
  const nonOverlapping: Match[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.end;
    }
  }

  // Build segments
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const m of nonOverlapping) {
    if (m.start > cursor) {
      segments.push({
        text: fullText.slice(cursor, m.start),
        isHighlight: false,
      });
    }
    segments.push({
      text: fullText.slice(m.start, m.end),
      isHighlight: true,
      type: m.highlight.type,
      label: m.highlight.label,
    });
    cursor = m.end;
  }

  if (cursor < fullText.length) {
    segments.push({
      text: fullText.slice(cursor),
      isHighlight: false,
    });
  }

  return segments;
}

/**
 * Authentic feedback dataset aligned with Vocalyze story arcs & reference photo themes.
 */
export const SAMPLE_FEEDBACK_ITEMS: FeedbackCardData[] = [
  {
    id: "fb-1",
    authorName: "Alex Rivera",
    authorInitials: "AR",
    authorBg: "bg-rose-100 text-rose-800 border-rose-200",
    department: "Engineering",
    channel: "voice",
    theme: "Workload & Burnout",
    sentiment: "negative",
    urgency: "high",
    tiltClass: "lg:-rotate-[0.6deg]",
    text: "I never get paid for overtime although working hours are well above the average. The team is burning out fast.",
    highlights: [
      { text: "never get paid for overtime", type: "negative", label: "Compensation risk" },
      { text: "working hours are well above the average", type: "attention", label: "Workload alert" },
      { text: "burning out fast", type: "negative", label: "Critical burnout signal" },
    ],
  },
  {
    id: "fb-2",
    authorName: "Sarah Miller",
    authorInitials: "SM",
    authorBg: "bg-amber-100 text-amber-800 border-amber-200",
    department: "Sales",
    channel: "text",
    theme: "Onboarding & Training",
    sentiment: "negative",
    urgency: "medium",
    tiltClass: "lg:rotate-[0.5deg]",
    text: "The sales team isn't given proper product training at the time of joining. We lose deals because reps cannot answer basic architecture questions.",
    highlights: [
      { text: "isn't given proper product training", type: "negative", label: "Training deficit" },
      { text: "time of joining", type: "attention", label: "Onboarding timeline" },
      { text: "lose deals", type: "negative", label: "Revenue friction" },
      { text: "cannot answer basic architecture questions", type: "attention", label: "Competency gap" },
    ],
  },
  {
    id: "fb-3",
    authorName: "David Kim",
    authorInitials: "DK",
    authorBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    department: "Product",
    channel: "text",
    theme: "Team Culture",
    sentiment: "positive",
    urgency: "low",
    tiltClass: "lg:-rotate-[0.4deg]",
    text: "The organization's vision and growth keep me motivated to work harder every single day. Leadership is transparent about where we are heading.",
    highlights: [
      { text: "vision and growth", type: "positive", label: "Strategic clarity" },
      { text: "keep me motivated to work harder", type: "positive", label: "High engagement" },
      { text: "Leadership is transparent", type: "positive", label: "Executive trust" },
    ],
  },
  {
    id: "fb-4",
    authorName: "Marcus Patel",
    authorInitials: "MP",
    authorBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    department: "Customer Support",
    channel: "voice",
    theme: "Tools & Resources",
    sentiment: "positive",
    urgency: "low",
    tiltClass: "lg:rotate-[0.6deg]",
    text: "The new helpdesk rollout is a game changer. Unified customer history saves hours, and our CSAT jumped 11 points this month.",
    highlights: [
      { text: "game changer", type: "positive", label: "Tooling win" },
      { text: "Unified customer history saves hours", type: "positive", label: "Operational efficiency" },
      { text: "CSAT jumped 11 points", type: "positive", label: "Measurable outcome" },
    ],
  },
  {
    id: "fb-5",
    authorName: "Tara Chen",
    authorInitials: "TC",
    authorBg: "bg-amber-100 text-amber-800 border-amber-200",
    department: "Operations",
    channel: "text",
    theme: "Communication",
    sentiment: "mixed",
    urgency: "medium",
    tiltClass: "lg:-rotate-[0.5deg]",
    text: "The leave policy should be communicated clearly so that we can plan our holidays. The current guidelines leave too much room for confusion.",
    highlights: [
      { text: "leave policy", type: "attention", label: "Policy friction" },
      { text: "communicated clearly", type: "attention", label: "Communication clarity" },
      { text: "plan our holidays", type: "positive", label: "Work-life balance" },
      { text: "room for confusion", type: "attention", label: "Process ambiguity" },
    ],
  },
  {
    id: "fb-6",
    authorName: "Nina Jackson",
    authorInitials: "NJ",
    authorBg: "bg-rose-100 text-rose-800 border-rose-200",
    department: "Design",
    channel: "ocr",
    theme: "Team Culture",
    sentiment: "negative",
    urgency: "high",
    tiltClass: "lg:rotate-[0.7deg]",
    text: "I don't like my team culture because of unhealthy competition. We need more psychological safety so people can speak up without fear.",
    highlights: [
      { text: "don't like my team culture", type: "negative", label: "Culture conflict" },
      { text: "unhealthy competition", type: "negative", label: "Toxic dynamic" },
      { text: "psychological safety", type: "attention", label: "Safety requirement" },
      { text: "without fear", type: "attention", label: "Retaliation concern" },
    ],
  },
  {
    id: "fb-7",
    authorName: "Elena Lopez",
    authorInitials: "EL",
    authorBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    department: "Engineering",
    channel: "text",
    theme: "Team Culture",
    sentiment: "positive",
    urgency: "low",
    tiltClass: "lg:-rotate-[0.7deg]",
    text: "My team members are very intelligent and expert at what they do. Great people to work with! Everyone stepped up during the database migration.",
    highlights: [
      { text: "very intelligent and expert", type: "positive", label: "Talent density" },
      { text: "Great people to work with!", type: "positive", label: "Team cohesion" },
      { text: "stepped up", type: "positive", label: "Ownership" },
    ],
  },
  {
    id: "fb-8",
    authorName: "Rahul Kapoor",
    authorInitials: "RK",
    authorBg: "bg-amber-100 text-amber-800 border-amber-200",
    department: "Finance",
    channel: "text",
    theme: "Management & Leadership",
    sentiment: "negative",
    urgency: "medium",
    tiltClass: "lg:rotate-[0.5deg]",
    text: "Mandatory approval of commercial proposals by senior leadership takes two weeks. It creates severe bottlenecks and delays customer onboarding.",
    highlights: [
      { text: "Mandatory approval", type: "attention", label: "Approval bottleneck" },
      { text: "takes two weeks", type: "attention", label: "SLA breach" },
      { text: "severe bottlenecks", type: "negative", label: "Operational friction" },
      { text: "delays customer onboarding", type: "negative", label: "Client impact" },
    ],
  },
  {
    id: "fb-9",
    authorName: "Priya Sharma",
    authorInitials: "PL",
    authorBg: "bg-rose-100 text-rose-800 border-rose-200",
    department: "Engineering",
    channel: "voice",
    theme: "Workload & Burnout",
    sentiment: "negative",
    urgency: "critical",
    tiltClass: "lg:-rotate-[0.5deg]",
    text: "Got paged at 3am three times this week for auto-recovering alerts. We need a proper on-call rotation before our top engineers start leaving.",
    highlights: [
      { text: "paged at 3am three times", type: "negative", label: "Sleep disruption" },
      { text: "auto-recovering alerts", type: "attention", label: "Alert noise" },
      { text: "proper on-call rotation", type: "attention", label: "Process fix" },
      { text: "before our top engineers start leaving", type: "negative", label: "Attrition risk" },
    ],
  },
];

/**
 * Pre-tokenized cards strictly limited to exactly 2 rows across all viewports:
 * - Mobile (< 640px): 1 column x 2 items = 2 rows (items 1 & 2)
 * - Tablet (640px - 1023px): 2 columns x 2 items = 2 rows (items 1, 2, 3, 4)
 * - Desktop (>= 1024px): 3 columns x 2 items = 2 rows (items 1, 2, 3, 4, 5, 6)
 *
 * Pre-tokenizing at initialization eliminates repeated string parsing in the render loop.
 */
export const TWO_ROW_FEEDBACK_ITEMS: PretokenizedCard[] = [
  // Row 1 (Top)
  {
    ...SAMPLE_FEEDBACK_ITEMS[0], // AR - Engineering · Overtime
    segments: tokenizeHighlightedText(SAMPLE_FEEDBACK_ITEMS[0].text, SAMPLE_FEEDBACK_ITEMS[0].highlights),
    responsiveVisibility: "block",
  },
  {
    ...SAMPLE_FEEDBACK_ITEMS[1], // SM - Sales · Onboarding & Training
    segments: tokenizeHighlightedText(SAMPLE_FEEDBACK_ITEMS[1].text, SAMPLE_FEEDBACK_ITEMS[1].highlights),
    responsiveVisibility: "block",
  },
  {
    ...SAMPLE_FEEDBACK_ITEMS[2], // DK - Product · Vision & Growth
    segments: tokenizeHighlightedText(SAMPLE_FEEDBACK_ITEMS[2].text, SAMPLE_FEEDBACK_ITEMS[2].highlights),
    responsiveVisibility: "hidden sm:block",
  },
  // Row 2 (Bottom)
  {
    ...SAMPLE_FEEDBACK_ITEMS[3], // MP - Customer Support · Helpdesk Tooling
    segments: tokenizeHighlightedText(SAMPLE_FEEDBACK_ITEMS[3].text, SAMPLE_FEEDBACK_ITEMS[3].highlights),
    responsiveVisibility: "hidden sm:block",
  },
  {
    ...SAMPLE_FEEDBACK_ITEMS[4], // TC - Operations · Leave Policy
    segments: tokenizeHighlightedText(SAMPLE_FEEDBACK_ITEMS[4].text, SAMPLE_FEEDBACK_ITEMS[4].highlights),
    responsiveVisibility: "hidden lg:block",
  },
  {
    ...SAMPLE_FEEDBACK_ITEMS[5], // NJ - Design · Team Culture & Safety
    segments: tokenizeHighlightedText(SAMPLE_FEEDBACK_ITEMS[5].text, SAMPLE_FEEDBACK_ITEMS[5].highlights),
    responsiveVisibility: "hidden lg:block",
  },
];
