import { after, NextResponse } from "next/server";
import { z } from "zod";
import { ActionInput, reviewPrivacy } from "@/lib/closed-loop";
import { authorizeConversation, loadConversation } from "@/lib/conversation-server";
import { feedbackRecipientHash, notify } from "@/lib/notify";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const MessageInput = z.object({
  kind: z.literal("message"), body: z.string().trim().min(1).max(4000),
  privacyReviewed: z.boolean().default(false),
}).strict();
const OutcomeInput = z.object({
  kind: z.literal("outcome"), outcome: z.enum(["resolved", "still_happening"]),
  revision: z.number().int().positive(),
}).strict();
const Input = z.union([MessageInput, OutcomeInput, z.object({ kind: z.literal("action"), action: ActionInput }).strict()]);
type Context = { params: Promise<{ code: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request, { params }: Context) {
  if (!rateLimit(`thread-read:${clientIp(req)}`, 120)) return json({ error: "Please wait a minute." }, 429);
  try {
    const { code } = await params;
    const row = await authorizeConversation(req, code, new URL(req.url).searchParams.get("as") === "hr");
    if (!row) return json({ error: "Sign in to the submitting account or enter your private reply key." }, 403);
    return json(await loadConversation(row.id));
  } catch {
    return json({ error: "Conversation unavailable. Please try again later." }, 503);
  }
}

export async function POST(req: Request, { params }: Context) {
  if (!rateLimit(`thread-write:${clientIp(req)}`, 30)) return json({ error: "Please wait a minute before trying again." }, 429);
  try {
    const { code } = await params;
    const hr = new URL(req.url).searchParams.get("as") === "hr";
    const row = await authorizeConversation(req, code, hr);
    if (!row) return json({ error: "You don't have access to this conversation." }, 403);
    const parsed = Input.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
    const body = parsed.data;
    const db = createAdminClient();
    if (body.kind === "message") {
      if (!hr && !body.privacyReviewed) return json({ error: "Review your reply before sending.", review: reviewPrivacy(body.body) }, 400);
      const { error } = await db.from("feedback_messages").insert({
        feedback_id: row.id, author_role: hr ? "hr" : "employee", body: body.body,
      } as never);
      if (error) throw error;
    } else if (body.kind === "action") {
      if (!hr) return json({ error: "Only HR can set an action." }, 403);
      const { revision, ...fields } = body.action;
      const values = { ...fields, revision: revision + 1, employee_outcome: null, confirmed_at: null, updated_at: new Date().toISOString() };
      if (revision === 0) {
        const { error } = await db.from("feedback_actions").insert({ ...values, feedback_id: row.id } as never);
        if (error?.code === "23505") return json({ error: "The action changed. Refresh before saving." }, 409);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("feedback_actions").update(values as never)
          .eq("feedback_id", row.id).eq("revision", revision).select("feedback_id").maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: "The action changed. Refresh before saving." }, 409);
      }
    } else {
      if (hr) return json({ error: "Only the employee can confirm an outcome." }, 403);
      const { data, error } = await db.from("feedback_actions").update({
        employee_outcome: body.outcome, confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), revision: body.revision + 1,
      } as never).eq("feedback_id", row.id).eq("revision", body.revision).eq("status", "completed")
        .select("feedback_id").maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "The action changed or is not completed. Refresh and review it again." }, 409);
    }
    if (hr) {
      const hash = feedbackRecipientHash(row);
      if (hash) after(() => notify({
        recipient: { hash }, type: "feedback_response",
        title: body.kind === "action" ? "HR updated the action on your feedback" : "HR sent a follow-up question or reply",
        body: "Open your private conversation to review the update.", link: `/portal/feedback/${code}`,
      }));
    }
    return json(await loadConversation(row.id));
  } catch {
    return json({ error: "Couldn't save the update. Refresh the conversation before trying again." }, 503);
  }
}
