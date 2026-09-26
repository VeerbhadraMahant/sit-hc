import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { anonHash } from "@/lib/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployeeUser, getHrUser } from "@/lib/supabase/server";
import type { Action, Conversation, ThreadMessage } from "@/lib/closed-loop";

export const hashReplyKey = (key: string) => createHash("sha256").update(key).digest("hex");
type FeedbackLink = { id: string; tracking_code: string; submitter_user_id: string | null; submitter_hash: string | null };

export async function authorizeConversation(req: Request, code: string, hr: boolean) {
  if (!/^VOC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return null;
  if (hr && !(await getHrUser())) return null;
  const db = createAdminClient();
  const { data: result, error } = await db.from("feedback")
    .select("id,tracking_code,submitter_user_id,submitter_hash")
    .eq("tracking_code", code).maybeSingle();
  if (error) throw new Error("Could not load feedback.");
  const data = result as FeedbackLink | null;
  if (!data) return null;
  if (hr) return data;
  const user = await getEmployeeUser();
  if (user && (data.submitter_user_id === user.id || data.submitter_hash === anonHash(user.id))) return data;
  const key = req.headers.get("x-reply-key");
  if (!key || !/^[a-f0-9]{64}$/.test(key)) return null;
  const { data: privateRow, error: keyError } = await db.from("feedback_private")
    .select("reply_token_hash").eq("feedback_id", data.id).maybeSingle();
  if (keyError) throw new Error("Could not verify reply key.");
  const expected = (privateRow as { reply_token_hash: string | null } | null)?.reply_token_hash;
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) return null;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hashReplyKey(key), "hex")) ? data : null;
}

export async function loadConversation(feedbackId: string): Promise<Conversation> {
  const db = createAdminClient();
  const [messages, action, history] = await Promise.all([
    db.from("feedback_messages").select("id,created_at,author_role,body")
      .eq("feedback_id", feedbackId).order("created_at", { ascending: false }).limit(200),
    db.from("feedback_actions").select("title,owner,due_date,status,evidence,revision,employee_outcome,confirmed_at,updated_at")
      .eq("feedback_id", feedbackId).maybeSingle(),
    db.from("feedback_action_history").select("id,created_at,snapshot")
      .eq("feedback_id", feedbackId).order("created_at", { ascending: false }).limit(50),
  ]);
  if (messages.error || action.error || history.error) throw new Error("Could not load conversation. Check the database migration.");
  return {
    messages: (messages.data ?? []).reverse() as ThreadMessage[],
    action: action.data as Action | null,
    history: (history.data ?? []) as Conversation["history"],
    canReply: true,
  };
}
