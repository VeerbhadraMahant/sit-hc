import "server-only";
import { randomInt } from "node:crypto";
import { analyzeFeedback } from "@/lib/ai/analyze";
import { embedText, toPgVector } from "@/lib/ai/embed";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { anonHash } from "@/lib/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { RISK_LABELS, type FeedbackRow, type RiskFlag } from "@/lib/types";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** e.g. VOC-7K4M-Q2XD — no ambiguous characters. */
export function generateTrackingCode() {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `VOC-${part()}-${part()}`;
}

export type NewFeedback = {
  text: string;
  channel: "text" | "voice" | "ocr";
  source?: "employee" | "hr_import" | "seed";
  department?: string | null;
  category?: string | null;
  isAnonymous: boolean;
  submitterName?: string | null;
  submitterEmail?: string | null;
  /** Signed-in employee. Stored as submitter_user_id (identified) or as an HMAC hash (anonymous). */
  submitterUserId?: string | null;
  language?: string | null;
  replyTokenHash?: string;
  /** "background": return right after the insert; caller schedules processFeedback (e.g. via after()). */
  analyze?: "sync" | "background";
};

/** Columns needed by callers of processFeedback — never the 768-float embedding. */
const PROCESSED_COLUMNS =
  "id,created_at,tracking_code,channel,language,redacted_text,department,category,is_anonymous,submitter_name,submitter_email,submitter_user_id,status,hr_response,responded_at,processing_status,processing_error,sentiment,sentiment_score,emotions,themes,summary,urgency,risk_flags,suggested_action";

/**
 * Stores feedback, runs AI analysis + embedding, and alerts HR on critical items.
 * Returns the row even if AI processing fails (processing_status = 'failed') so no feedback is lost.
 */
export async function createFeedback(input: NewFeedback): Promise<{ id: string; trackingCode: string; row: FeedbackRow | null }> {
  const db = createAdminClient();
  const trackingCode = generateTrackingCode();
  const userId = input.submitterUserId || null;

  const { data: inserted, error } = await db
    .from("feedback")
    .insert({
      tracking_code: trackingCode,
      channel: input.channel,
      source: input.source ?? "employee",
      raw_text: input.text,
      language: input.language ?? null,
      department: input.department || null,
      category: input.category || null,
      is_anonymous: input.isAnonymous,
      submitter_name: input.isAnonymous ? null : input.submitterName || null,
      submitter_email: input.isAnonymous ? null : input.submitterEmail || null,
      submitter_user_id: input.isAnonymous ? null : userId,
      submitter_hash: input.isAnonymous && userId ? anonHash(userId) : null,
    } as never)
    .select("id")
    .single();
  if (error || !inserted) throw new Error(`Could not save feedback: ${error?.message}`);

  const id = (inserted as { id: string }).id;
  if (input.replyTokenHash) {
    const { error: keyError } = await db.from("feedback_private")
      .update({ reply_token_hash: input.replyTokenHash } as never).eq("feedback_id", id);
    if (keyError) throw new Error("Could not save private reply key.");
  }
  if (input.analyze === "background") return { id, trackingCode, row: null };
  const row = await processFeedback(id);
  return { id, trackingCode, row };
}

/** (Re)runs analysis for a stored feedback row. Safe to call again after a failure. */
export async function processFeedback(id: string): Promise<FeedbackRow | null> {
  const db = createAdminClient();
  const { data } = await db.from("feedback").select(PROCESSED_COLUMNS).eq("id", id).single();
  const fb = data as FeedbackRow | null;
  if (!fb) return null;

  try {
    const { data: privateData, error: intakeError } = await db.from("feedback_private").select("raw_text").eq("feedback_id", id).maybeSingle();
    const intake = privateData as { raw_text: string | null } | null;
    if (intakeError) throw intakeError;
    if (!intake?.raw_text) return fb;
    const analysis = await analyzeFeedback({ text: intake.raw_text, department: fb.department, category: fb.category });
    const embedding = await embedText(`${analysis.summary}\n${analysis.redacted_text}`);

    const { data: updated, error } = await db
      .from("feedback")
      .update({
        language: fb.language ?? analysis.language,
        redacted_text: analysis.redacted_text,
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        sentiment_score: analysis.sentiment_score,
        emotions: analysis.emotions,
        themes: analysis.themes,
        urgency: analysis.urgency,
        risk_flags: analysis.risk_flags,
        suggested_action: analysis.suggested_action,
        embedding: toPgVector(embedding),
        processing_status: "done",
        processing_error: null,
      } as never)
      .eq("id", id)
      .select(PROCESSED_COLUMNS)
      .single();
    if (error) throw error;

    if (fb.is_anonymous) {
      const { error: clearError } = await db.from("feedback_private").update({ raw_text: null } as never).eq("feedback_id", id);
      if (clearError) throw clearError;
    }

    const row = updated as FeedbackRow;
    if (row.urgency === "critical") void alertHrOfCritical(row);
    return row;
  } catch {
    // Provider errors can contain original input; never log or expose their payloads.
    console.error("[pipeline] analysis failed", id);
    await db
      .from("feedback")
      .update({ processing_status: "failed", processing_error: "Processing unavailable. Private input is retained for retry." } as never)
      .eq("id", id);
    return { ...fb, processing_status: "failed" };
  }
}

async function alertHrOfCritical(row: FeedbackRow) {
  const to = process.env.HR_ALERT_EMAIL;
  if (!to) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const flags = (row.risk_flags ?? []).map((f) => RISK_LABELS[f as RiskFlag] ?? f).join(", ") || "—";
  await sendEmail({
    to,
    subject: `Critical feedback needs attention — ${row.department ?? "Unspecified team"}`,
    html: emailLayout({
      eyebrow: "Critical alert",
      title: "New feedback was flagged as critical",
      body: `<p><strong>Summary:</strong> ${escapeHtml(row.summary ?? "")}</p>
<p><strong>Department:</strong> ${escapeHtml(row.department ?? "Not specified")}<br/><strong>Risk flags:</strong> ${escapeHtml(flags)}</p>
<p><strong>Suggested next step:</strong> ${escapeHtml(row.suggested_action ?? "")}</p>`,
      cta: { label: "Open in dashboard", href: `${appUrl}/dashboard/feedback?id=${row.id}` },
    }),
  });
}
