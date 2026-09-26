import { after, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { hashReplyKey } from "@/lib/conversation-server";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { createFeedback, processFeedback } from "@/lib/pipeline";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSessionClaims } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z
  .object({
    text: z.string().trim().min(10, "Please write at least 10 characters.").max(5000, "Please keep it under 5000 characters."),
    channel: z.enum(["text", "voice", "ocr"]).default("text"),
    department: z.string().trim().max(80).nullish(),
    category: z.string().trim().max(80).nullish(),
    isAnonymous: z.boolean().default(true),
    name: z.string().trim().max(120).nullish(),
    email: z.string().trim().email("Please enter a valid email.").max(200).nullish().or(z.literal("")),
    language: z.string().trim().max(40).nullish(),
  })
  .strict();

/**
 * Saves feedback and returns immediately; AI analysis runs after the response via after().
 * Clients poll GET /api/track/[code] for the summary. If the caller is a signed-in employee,
 * the row is linked to them (identified) or to an HMAC of their id (anonymous).
 */
export async function POST(req: Request) {
  if (!rateLimit(`feedback:${clientIp(req)}`, 6)) {
    return NextResponse.json({ error: "You've sent several messages just now — please wait a minute." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid feedback." }, { status: 400 });
  }
  const body = parsed.data;
  const session = await getSessionClaims();
  const email = body.isAnonymous ? null : body.email || session?.email || null;
  const name = body.isAnonymous ? null : body.name || null;
  const replyKey = randomBytes(32).toString("hex");

  let result: Awaited<ReturnType<typeof createFeedback>>;
  try {
    result = await createFeedback({
      text: body.text,
      channel: body.channel,
      source: "employee",
      department: body.department,
      category: body.category,
      isAnonymous: body.isAnonymous,
      submitterName: name,
      submitterEmail: email,
      submitterUserId: session?.id ?? null,
      language: body.language,
      analyze: "background",
      replyTokenHash: hashReplyKey(replyKey),
    });
  } catch (err) {
    console.error("[api/feedback]", err);
    return NextResponse.json(
      { error: "We couldn't save your feedback right now. Please try again in a moment." },
      { status: 500 },
    );
  }

  const { id, trackingCode } = result;
  after(() => processFeedback(id));

  if (email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const org = process.env.NEXT_PUBLIC_ORG_NAME || "your company";
    after(() =>
      sendEmail({
        to: email,
        subject: `We received your feedback — ${trackingCode}`,
        html: emailLayout({
          eyebrow: "Feedback received",
          title: `Thanks${name ? `, ${name.split(" ")[0]}` : ""} — your voice was heard`,
          body: `<p>Your feedback to ${escapeHtml(org)}'s People team was received and is now in their queue.</p>
<p>Your tracking code is <strong style="font-family:'IBM Plex Mono',monospace;letter-spacing:1px">${escapeHtml(trackingCode)}</strong>. Use it any time to see the status and HR's response.</p>`,
          cta: { label: "Track your feedback", href: `${appUrl}/track/${trackingCode}` },
        }),
      }),
    );
  }

  return NextResponse.json({ trackingCode, replyKey, summary: null, themes: [], processing_status: "pending", linked: !!session }, { headers: { "Cache-Control": "no-store" } });
}
