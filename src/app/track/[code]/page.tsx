import { Check, FileText, Mic, PenLine, ScanLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/submit/public-header";
import { CopyCode } from "@/components/submit/copy-code";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { STATUSES, STATUS_LABELS, type FeedbackStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { lookupFeedback, normalizeCode } from "../lookup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Feedback status — Vocalyze", robots: { index: false } };

const STATUS_HINTS: Record<FeedbackStatus, string> = {
  new: "Your feedback is safely stored and has been analysed.",
  in_review: "The People team is reviewing it alongside related feedback.",
  actioned: "Action has been taken in response.",
  closed: "This item is closed. Thank you for speaking up.",
};

const channelMeta = {
  text: { label: "Written", Icon: PenLine },
  voice: { label: "Voice note", Icon: Mic },
  ocr: { label: "Scanned note", Icon: ScanLine },
} as const;

export default async function TrackCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeCode(raw);
  const fb = await lookupFeedback(code);
  if (!fb) redirect("/track?notfound=1");

  const current = STATUSES.indexOf(fb.status);
  const channel = channelMeta[fb.channel] ?? channelMeta.text;

  return (
    <div className="grid-paper min-h-dvh">
      <PublicHeader />
      <main className="mx-auto max-w-[760px] px-4 py-12 sm:py-16">
        <p className="eyebrow">Feedback status</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-medium tracking-wider text-obsidian sm:text-3xl">{code}</h1>
          <CopyCode code={code} />
        </div>
        <p className="mt-2 text-sm text-pewter">
          Submitted {formatDate(fb.created_at, { day: "numeric", month: "long", year: "numeric" })}
        </p>

        {/* Timeline */}
        <Card className="mt-8" glow="cyan">
          <ol className="grid gap-6 sm:grid-cols-4 sm:gap-2" aria-label="Status timeline">
            {STATUSES.map((s, i) => {
              const done = i <= current;
              const isCurrent = i === current;
              return (
                <li key={s} className="relative flex gap-3 sm:flex-col sm:gap-2" aria-current={isCurrent ? "step" : undefined}>
                  {i < STATUSES.length - 1 && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-8 left-[15px] h-[calc(100%-8px)] w-0.5 sm:top-[15px] sm:left-8 sm:h-0.5 sm:w-[calc(100%-24px)]",
                        i < current ? "bg-carbon" : "bg-mist",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                      done ? "bg-carbon text-paper" : "bg-paper text-pewter shadow-field",
                      isCurrent && "ring-4 ring-lime",
                    )}
                  >
                    {done ? <Check className="size-4" aria-hidden /> : i + 1}
                  </span>
                  <div>
                    <p className={cn("text-sm font-semibold", done ? "text-ink" : "text-pewter")}>{STATUS_LABELS[s]}</p>
                    {isCurrent && <p className="mt-0.5 text-sm text-pewter">{STATUS_HINTS[s]}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* You said / we did */}
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
              {fb.summary ?? "Your feedback is being analysed. Check back shortly."}
            </p>
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
                  No response yet. HR reviews feedback in themes — even without a direct reply, your input is counted in
                  the insights leadership sees.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/submit" variant="dark">
            Share more feedback
          </ButtonLink>
          <Link href="/track" className="inline-flex h-11 items-center px-2 font-medium text-cobalt hover:underline">
            Track a different code
          </Link>
        </div>
      </main>
    </div>
  );
}
