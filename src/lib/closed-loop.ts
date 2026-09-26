import { z } from "zod";

export const ActionInput = z.object({
  title: z.string().trim().min(3).max(500),
  owner: z.string().trim().min(2).max(120),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Choose a valid due date."),
  status: z.enum(["planned", "in_progress", "completed"]),
  evidence: z.string().trim().max(4000).default(""),
  revision: z.number().int().min(0),
}).strict().refine((v) => v.status !== "completed" || v.evidence.length >= 10, {
  message: "Describe what changed before marking the action completed.", path: ["evidence"],
});

export type Action = Omit<z.infer<typeof ActionInput>, "revision"> & {
  revision: number;
  employee_outcome: "resolved" | "still_happening" | null;
  confirmed_at: string | null;
  updated_at: string;
};
export type ThreadMessage = { id: string; created_at: string; author_role: "employee" | "hr"; body: string };
export type Conversation = {
  messages: ThreadMessage[];
  action: Action | null;
  history: { id: string; created_at: string; snapshot: Action }[];
  canReply: boolean;
};

/** Local, deterministic assistance. It cannot guarantee anonymity or detect every identifying detail. */
export function reviewPrivacy(text: string) {
  const warnings: string[] = [];
  let suggestion = text;
  const rules: [RegExp, string, string][] = [
    [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]", "An email address could identify someone."],
    [/(?<!\w)\+?\d[\d ()-]{7,}\d(?!\w)/g, "[number removed]", "A phone number or identifier could reveal your identity."],
    [/\b(?:my name is|I am called|I'm called)\s+[^,.!?\n]+/gi, "[name removed]", "You may be sharing your name."],
    [/\b(?:I(?:'m| am)\s+)?the only\s+[^,.!?\n]+/gi, "someone on the team", "A unique role or shift can identify you, even without your name."],
    [/\b(?:employee|staff)\s*(?:id|number|#)\s*[:#-]?\s*[A-Z0-9-]+/gi, "[employee ID removed]", "An employee identifier can identify you."],
  ];
  for (const [pattern, replacement, warning] of rules) {
    if (pattern.test(suggestion)) {
      warnings.push(warning);
      pattern.lastIndex = 0;
      suggestion = suggestion.replace(pattern, replacement);
    }
  }
  return { warnings, suggestion };
}
