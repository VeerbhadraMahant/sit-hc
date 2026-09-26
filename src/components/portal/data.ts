import "server-only";
import { anonHash } from "@/lib/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FeedbackStatus, ProcessingStatus } from "@/lib/types";

/** What an employee may see about their own feedback. Never urgency, risk flags, raw text or the hash. */
export const MY_FEEDBACK_COLUMNS =
  "tracking_code,created_at,status,hr_response,responded_at,summary,themes,channel,is_anonymous,processing_status";

export type MyFeedback = {
  tracking_code: string;
  created_at: string;
  status: FeedbackStatus;
  hr_response: string | null;
  responded_at: string | null;
  summary: string | null;
  themes: string[] | null;
  channel: "text" | "voice" | "ocr";
  is_anonymous: boolean;
  processing_status: ProcessingStatus;
};

/** PostgREST `or` filter matching identified rows (user id) and anonymous rows (HMAC hash). */
function ownerFilter(userId: string) {
  return `submitter_user_id.eq.${userId},submitter_hash.eq.${anonHash(userId)}`;
}

export async function listMyFeedback(userId: string, limit = 100): Promise<MyFeedback[]> {
  const { data, error } = await createAdminClient()
    .from("feedback")
    .select(MY_FEEDBACK_COLUMNS)
    .or(ownerFilter(userId))
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[portal] listMyFeedback", error.message);
    return [];
  }
  return (data ?? []) as MyFeedback[];
}

const CODE_PATTERN = /^(VOC|PLS)-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One of my feedback items, looked up by tracking code or by row id (notifications link by id). */
export async function getMyFeedback(userId: string, rawIdentifier: string): Promise<MyFeedback | null> {
  const identifier = decodeURIComponent(rawIdentifier).trim();
  const query = createAdminClient().from("feedback").select(MY_FEEDBACK_COLUMNS).or(ownerFilter(userId));
  const filtered = UUID_PATTERN.test(identifier)
    ? query.eq("id", identifier)
    : CODE_PATTERN.test(identifier.toUpperCase().replace(/\s+/g, ""))
      ? query.eq("tracking_code", identifier.toUpperCase().replace(/\s+/g, ""))
      : null;
  if (!filtered) return null;
  const { data, error } = await filtered.maybeSingle();
  if (error) {
    console.error("[portal] getMyFeedback", error.message);
    return null;
  }
  return (data as MyFeedback | null) ?? null;
}

export function feedbackStats(items: MyFeedback[]) {
  const responded = items.filter((f) => !!f.hr_response).length;
  const awaiting = items.filter((f) => !f.hr_response && f.status !== "closed").length;
  return { total: items.length, responded, awaiting };
}
