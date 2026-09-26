import { NextResponse } from "next/server";
import { z } from "zod";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { createClient, getHrUser } from "@/lib/supabase/server";
import { FEEDBACK_COLUMNS, STATUSES, type FeedbackRow } from "@/lib/types";

const PatchSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    hr_response: z.string().trim().max(4000).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.hr_response !== undefined, { message: "Nothing to update" });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });

  const supabase = await createClient();
  const { data: before } = await supabase.from("feedback").select(FEEDBACK_COLUMNS).eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prev = before as unknown as FeedbackRow;

  const patch: Record<string, unknown> = {};
  if (parsed.data.status) patch.status = parsed.data.status;
  const response = parsed.data.hr_response === undefined ? undefined : parsed.data.hr_response || null;
  const responseChanged = response !== undefined && response !== prev.hr_response;
  if (responseChanged) {
    patch.hr_response = response;
    patch.responded_at = response ? new Date().toISOString() : null;
    if (response && !parsed.data.status && prev.status === "new") patch.status = "actioned";
  }

  const { data, error } = await supabase
    .from("feedback")
    .update(patch as never)
    .eq("id", id)
    .select(FEEDBACK_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const row = data as unknown as FeedbackRow;

  let emailed = false;
  if (responseChanged && response && row.submitter_email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const result = await sendEmail({
      to: row.submitter_email,
      subject: "HR has responded to your feedback",
      html: emailLayout({
        eyebrow: "You said, we did",
        title: "Thanks for speaking up — here's our response",
        body: `<p>${row.submitter_name ? `Hi ${escapeHtml(row.submitter_name)},` : "Hi,"}</p>
<p>You shared feedback with us${row.summary ? ` about: <em>${escapeHtml(row.summary)}</em>` : ""}.</p>
<p style="padding:16px;border-radius:14px;background:#f4f6fb;white-space:pre-wrap">${escapeHtml(response)}</p>
<p>Your tracking code is <strong style="font-family:'IBM Plex Mono',monospace">${escapeHtml(row.tracking_code)}</strong>.</p>`,
        cta: { label: "View status", href: `${appUrl}/track/${row.tracking_code}` },
      }),
    });
    emailed = result.ok;
  }

  return NextResponse.json({ feedback: row, emailed });
}
