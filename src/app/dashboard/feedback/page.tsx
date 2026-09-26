import { Suspense } from "react";
import { Download, FileText, Inbox, Mic, ScanText } from "lucide-react";
import Link from "next/link";
import { FeedbackDetail } from "@/components/dashboard/feedback-detail";
import { FeedbackFiltersBar } from "@/components/dashboard/feedback-filters";
import { SentimentBadge, UrgencyBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getFeedbackDetail, listFeedback, readFilters } from "@/lib/dashboard-data";
import { STATUS_LABELS, type FeedbackRow } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export const metadata = { title: "Feedback — Pulse HR" };

const CHANNEL_ICON = { text: FileText, voice: Mic, ocr: ScanText } as const;

function withParam(sp: Record<string, string | undefined>, key: string, value: string | null) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== key) p.set(k, v);
  if (value) p.set(key, value);
  const s = p.toString();
  return `/dashboard/feedback${s ? `?${s}` : ""}`;
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const sp = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const filters = readFilters(sp);
  const selectedId = sp.id;

  const [rows, detail] = await Promise.all([
    listFeedback(filters),
    selectedId ? getFeedbackDetail(selectedId) : Promise.resolve(null),
  ]);

  const exportQs = new URLSearchParams(
    Object.entries(sp).filter(([k, v]) => k !== "id" && v) as [string, string][],
  ).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="text-heading-md font-semibold text-obsidian">Feedback</h1>
          <p className="mt-1 text-pewter">
            {rows.length} {rows.length === 1 ? "item" : "items"}
            {rows.length >= 500 ? " (showing latest 500)" : ""}
          </p>
        </div>
        <a
          href={`/api/export${exportQs ? `?${exportQs}` : ""}`}
          className="inline-flex h-11 items-center gap-2 self-start rounded-buttons bg-paper px-5 font-medium text-ink shadow-field hover:bg-white"
        >
          <Download className="size-4" aria-hidden /> Export CSV
        </a>
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <FeedbackFiltersBar />
      </Suspense>

      <div className={cn("grid gap-4", detail && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]")}>
        <Card className="overflow-hidden p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <Inbox className="size-10 text-pewter" aria-hidden />
              <p className="mt-3 font-medium text-ink">No feedback matches these filters</p>
              <Link href="/dashboard/feedback" className="mt-2 text-sm font-medium text-cobalt hover:underline">
                Clear filters
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-mist">
              {rows.map((f) => (
                <FeedbackListItem key={f.id} f={f} href={withParam(sp, "id", f.id)} active={f.id === selectedId} />
              ))}
            </ul>
          )}
        </Card>

        {detail && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-obsidian/40 p-3 backdrop-blur-sm lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="lg:sticky lg:top-24">
              {detail.feedback ? (
                <FeedbackDetail
                  key={detail.feedback.id}
                  feedback={detail.feedback}
                  notes={detail.notes}
                  closeHref={withParam(sp, "id", null)}
                />
              ) : (
                <Card>
                  <p className="text-ink">This feedback item was not found.</p>
                  <Link href={withParam(sp, "id", null)} className="mt-2 inline-block text-sm text-cobalt hover:underline">
                    Close
                  </Link>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackListItem({ f, href, active }: { f: FeedbackRow; href: string; active: boolean }) {
  const Icon = CHANNEL_ICON[f.channel as keyof typeof CHANNEL_ICON] ?? FileText;
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={cn(
          "relative block px-5 py-4 transition-colors hover:bg-mist/50",
          active && "bg-mist/70 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-cobalt",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <UrgencyBadge urgency={f.urgency} />
          <SentimentBadge sentiment={f.sentiment} />
          {f.processing_status === "failed" && (
            <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-ink">Analysis failed</span>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-pewter">
            <Icon className="size-3.5" aria-label={f.channel} />
            {timeAgo(f.created_at)}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[15px] leading-snug text-ink">
          {f.summary ?? f.redacted_text ?? "Awaiting analysis…"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-pewter">
          <span className="font-medium text-graphite">{f.department ?? "Unspecified"}</span>
          {(f.themes ?? []).slice(0, 2).map((t) => (
            <span key={t}>#{t}</span>
          ))}
          <span className="ml-auto">{STATUS_LABELS[f.status]}</span>
        </div>
      </Link>
    </li>
  );
}
