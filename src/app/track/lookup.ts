import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FeedbackStatus } from "@/lib/types";

/** Fields an employee may see about their own submission. Never urgency, risk flags or raw text. */
export const SAFE_TRACK_COLUMNS = "created_at,status,hr_response,responded_at,summary,themes,channel";

export type TrackedFeedback = {
  created_at: string;
  status: FeedbackStatus;
  hr_response: string | null;
  responded_at: string | null;
  summary: string | null;
  themes: string[] | null;
  channel: "text" | "voice" | "ocr";
};

export function normalizeCode(raw: string) {
  return decodeURIComponent(raw).trim().toUpperCase().replace(/\s+/g, "");
}

export const CODE_PATTERN = /^(VOC|PLS)-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export async function lookupFeedback(rawCode: string): Promise<TrackedFeedback | null> {
  const code = normalizeCode(rawCode);
  if (!CODE_PATTERN.test(code)) return null;
  const { data, error } = await createAdminClient()
    .from("feedback")
    .select(SAFE_TRACK_COLUMNS)
    .eq("tracking_code", code)
    .maybeSingle();
  if (error) {
    console.error("[track] lookup failed", error);
    return null;
  }
  return (data as TrackedFeedback | null) ?? null;
}
