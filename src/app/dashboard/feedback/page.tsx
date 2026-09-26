import { Suspense } from "react";
import { AlertOctagon, ChevronLeft, ChevronRight, Download, FileText, Inbox, Mic, ScanText } from "lucide-react";
import Link from "next/link";
import { FeedbackDetail } from "@/components/dashboard/feedback-detail";
import { FeedbackFiltersBar } from "@/components/dashboard/feedback-filters";
import { SentimentBadge, UrgencyBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getFeedbackDetail,
  INBOX_PAGE_SIZE,
  listFeedbackPage,
  readFilters,
  type FeedbackFilters,
  type ListRow,
} from "@/lib/dashboard-data";
import { RISK_LABELS, STATUS_LABELS, type RiskFlag } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export const metadata = { title: "Feedback — Vocalyze HR" };

const CHANNEL_ICON = { text: FileText, voice: Mic, ocr: ScanText } as const;

type Params = Record<string, string | undefined>;

function withParam(sp: Params, key: string, value: string | null) {
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
  const sp: Params = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const filters = readFilters(sp);
  const page = Number(sp.page) || 1;
  const selectedId = sp.id;

  const exportQs = new URLSearchParams(
    Object.entries(sp).filter(([k, v]) => k !== "id" && k !== "page" && v) as [string, string][],
  ).toString();
  // The list only depends on filters + page, so opening an item (?id=) keeps it mounted.
  const listKey = withParam(sp, "id", null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="text-heading-md font-semibold text-obsidian">Feedback</h1>
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

      <div className={cn("grid gap-4", selectedId && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]")}>
        <Suspense key={listKey} fallback={<ListSkeleton />}>
          <FeedbackList filters={filters} page={page} sp={sp} selectedId={selectedId} />
        </Suspense>

        {selectedId && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-obsidian/40 p-3 backdrop-blur-sm lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="lg:sticky lg:top-24">
              <Suspense key={selectedId} fallback={<DetailSkeleton />}>
                <DetailPanel id={selectedId} closeHref={withParam(sp, "id", null)} />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function FeedbackList({
  filters,
  page,
  sp,
  selectedId,
}: {
  filters: FeedbackFilters;
  page: number;
  sp: Params;
  selectedId?: string;
}) {
  const { rows, total, hasMore, page: current } = await listFeedbackPage(filters, page);
  const first = (current - 1) * INBOX_PAGE_SIZE + 1;
  const last = first + rows.length - 1;
  const base = { ...sp, id: undefined };

  return (
    <div className="space-y-3">
      <p className="text-sm text-pewter" aria-live="polite">
        {total === 0 ? "No items" : `Showing ${first}–${last} of ${total} ${total === 1 ? "item" : "items"}`}
      </p>
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
      {(current > 1 || hasMore) && (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          {current > 1 ? (
            <Link
              href={withParam(base, "page", current > 2 ? String(current - 1) : null)}
              className="inline-flex h-9 items-center gap-1 rounded-buttons px-4 text-sm font-medium text-ink shadow-field hover:bg-mist"
            >
              <ChevronLeft className="size-4" aria-hidden /> Newer
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link
              href={withParam(base, "page", String(current + 1))}
              className="inline-flex h-9 items-center gap-1 rounded-buttons px-4 text-sm font-medium text-ink shadow-field hover:bg-mist"
            >
              Older <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

async function DetailPanel({ id, closeHref }: { id: string; closeHref: string }) {
  const detail = await getFeedbackDetail(id);
  if (!detail.feedback) {
    return (
      <Card>
        <p className="text-ink">This feedback item was not found.</p>
        <Link href={closeHref} className="mt-2 inline-block text-sm text-cobalt hover:underline">
          Close
        </Link>
      </Card>
    );
  }
  return <FeedbackDetail key={detail.feedback.id} feedback={detail.feedback} notes={detail.notes} closeHref={closeHref} />;
}

function FeedbackListItem({ f, href, active }: { f: ListRow; href: string; active: boolean }) {
  const Icon = CHANNEL_ICON[f.channel as keyof typeof CHANNEL_ICON] ?? FileText;
  const isCritical = f.urgency === "critical";
  const isHigh = f.urgency === "high";

  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={cn(
          "relative block px-5 py-4 transition-colors",
          isCritical
            ? "border-l-[3px] border-l-[#d03b3b] bg-red-500/[0.04] hover:bg-red-500/[0.08]"
            : isHigh
            ? "border-l-[3px] border-l-amber-500 bg-amber-500/[0.02] hover:bg-amber-500/[0.06]"
            : "hover:bg-mist/50",
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
        <p className="mt-2 line-clamp-2 text-[15px] leading-snug text-ink font-medium">
          {f.summary ?? (f.processing_status === "failed" ? "Analysis failed — open to retry" : "Analyzing…")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-pewter">
          <span className="font-semibold text-graphite">{f.department ?? "Unspecified"}</span>
          {(f.themes ?? []).slice(0, 2).map((t) => (
            <span key={t}>#{t}</span>
          ))}
          {(f.risk_flags ?? []).map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-full border border-red-200/90 bg-red-500/10 px-2 py-0.2 text-[11px] font-semibold text-[#d03b3b]"
            >
              <AlertOctagon className="size-3" aria-hidden />
              {RISK_LABELS[r as RiskFlag] ?? r}
            </span>
          ))}
          <span className="ml-auto font-medium text-graphite">{STATUS_LABELS[f.status]}</span>
        </div>
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading feedback">
      <div className="h-5 w-40 animate-pulse rounded bg-mist" />
      <div className="overflow-hidden rounded-cards bg-paper shadow-card">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2 border-b border-mist px-5 py-4 last:border-0">
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-mist" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-mist" />
            </div>
            <div className="h-4 w-11/12 animate-pulse rounded bg-mist/80" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-mist/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 rounded-cards bg-paper p-6 shadow-card" aria-busy="true" aria-label="Loading feedback item">
      <div className="h-5 w-32 animate-pulse rounded bg-mist" />
      <div className="h-7 w-3/4 animate-pulse rounded bg-mist" />
      <div className="space-y-2">
        <div className="h-4 animate-pulse rounded bg-mist/80" />
        <div className="h-4 animate-pulse rounded bg-mist/80" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-mist/80" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-mist" />
        ))}
      </div>
      <div className="h-28 animate-pulse rounded-smallcards bg-mist/70" />
    </div>
  );
}
