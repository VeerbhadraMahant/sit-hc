import { ArrowLeft, EyeOff, FileText, Mic, PenLine, ScanLine, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyFeedback } from "@/components/portal/data";
import { StatusTimeline } from "@/components/portal/status-timeline";
import { CopyCode } from "@/components/submit/copy-code";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireEmployee } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Feedback — Vocalyze" };

const channelMeta = {
  text: { label: "Written", Icon: PenLine },
  voice: { label: "Voice note", Icon: Mic },
  ocr: { label: "Scanned note", Icon: ScanLine },
} as const;

export default async function MyFeedbackDetail({ params }: { params: Promise<{ code: string }> }) {
  const [user, { code }] = await Promise.all([requireEmployee(), params]);
  const fb = await getMyFeedback(user.id, code);
  if (!fb) notFound();

  const channel = channelMeta[fb.channel] ?? channelMeta.text;

  return (
    <div className="mx-auto max-w-[860px]">
      <Link href="/portal/feedback" className="inline-flex items-center gap-1 text-sm font-medium text-cobalt hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> My feedback
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-medium tracking-wider text-obsidian sm:text-3xl">{fb.tracking_code}</h1>
        <CopyCode code={fb.tracking_code} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-pewter">
        <span>Submitted {formatDate(fb.created_at, { day: "numeric", month: "long", year: "numeric" })}</span>
        <Badge>
          {fb.is_anonymous ? <EyeOff className="size-3.5" aria-hidden /> : <UserRound className="size-3.5" aria-hidden />}
          {fb.is_anonymous ? "Anonymous" : "With your name"}
        </Badge>
      </div>

      <Card className="mt-8" glow="cyan">
        <StatusTimeline status={fb.status} />
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <p className="eyebrow">You said</p>
          <div className="mt-2 mb-3 flex flex-wrap gap-2">
            <Badge>
              <channel.Icon className="size-3.5" aria-hidden />
              {channel.label}
            </Badge>
            {(fb.themes ?? []).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <p className="leading-relaxed text-ink">
            {fb.summary ??
              (fb.processing_status === "failed"
                ? "Your feedback is saved. Our summary isn't available yet — HR can still read it."
                : "Your feedback is being analysed. Check back shortly.")}
          </p>
          {fb.is_anonymous && (
            <p className="mt-4 text-xs text-pewter">
              HR sees a redacted English version of your words — never your name or this link to your account.
            </p>
          )}
        </Card>

        <Card glow={fb.hr_response ? "lime" : undefined} arc={!!fb.hr_response}>
          <p className="eyebrow">We did</p>
          {fb.hr_response ? (
            <>
              <p className="mt-2 leading-relaxed whitespace-pre-line text-ink">{fb.hr_response}</p>
              {fb.responded_at && (
                <p className="mt-4 text-sm text-pewter">
                  People team · {formatDate(fb.responded_at, { day: "numeric", month: "long" })}
                </p>
              )}
            </>
          ) : (
            <div className="mt-2 flex gap-3 text-pewter">
              <FileText className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p className="leading-relaxed">
                No response yet. You&apos;ll get a notification here as soon as HR responds or the status changes.
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-10">
        <ButtonLink href="/portal/feedback/new" variant="dark">
          Share more feedback
        </ButtonLink>
      </div>
    </div>
  );
}
