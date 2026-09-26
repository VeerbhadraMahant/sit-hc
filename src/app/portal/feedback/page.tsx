import { ArrowRight, EyeOff, MessageSquarePlus, MessageSquareReply, Mic, PenLine, ScanLine, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { feedbackStats, listMyFeedback, type MyFeedback } from "@/components/portal/data";
import { StatusBadge } from "@/components/portal/status-timeline";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireEmployee } from "@/lib/supabase/server";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My feedback — Vocalyze" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "awaiting", label: "Awaiting response" },
  { value: "responded", label: "HR responded" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

const channelIcon = { text: PenLine, voice: Mic, ocr: ScanLine } as const;

function applyFilter(items: MyFeedback[], f: Filter) {
  if (f === "awaiting") return items.filter((i) => !i.hr_response && i.status !== "closed");
  if (f === "responded") return items.filter((i) => !!i.hr_response);
  return items;
}

export default async function MyFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, sp] = await Promise.all([requireEmployee(), searchParams]);
  const filter: Filter = FILTERS.some((f) => f.value === sp.filter) ? (sp.filter as Filter) : "all";
  const all = await listMyFeedback(user.id);
  const stats = feedbackStats(all);
  const items = applyFilter(all, filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">My feedback</p>
          <h1 className="mt-1 text-heading-md font-semibold text-obsidian">Everything you&apos;ve shared</h1>
          <p className="mt-2 max-w-xl text-pewter">
            Anonymous items appear here because of a one-way code only this portal can match — HR never sees who sent them.
          </p>
        </div>
        <ButtonLink href="/portal/feedback/new" className="shrink-0">
          <MessageSquarePlus className="size-4" aria-hidden /> Give feedback
        </ButtonLink>
      </div>

      <nav aria-label="Filter feedback" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.value === "all" ? stats.total : f.value === "awaiting" ? stats.awaiting : stats.responded;
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/portal/feedback" : `/portal/feedback?filter=${f.value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-navlinks px-4 text-sm font-medium transition-colors",
                active ? "bg-carbon text-paper" : "bg-paper text-ink shadow-field hover:bg-mist",
              )}
            >
              {f.label}
              <span className={cn("tabular-nums", active ? "text-silver" : "text-pewter")}>{count}</span>
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <Card className="py-14 text-center">
          <p className="font-semibold text-ink">{all.length === 0 ? "You haven't shared any feedback yet" : "Nothing in this view"}</p>
          <p className="mt-1 text-sm text-pewter">
            {all.length === 0 ? "Your submissions — anonymous or named — will show up here." : "Try a different filter."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((f) => {
            const Icon = channelIcon[f.channel] ?? PenLine;
            return (
              <li key={f.tracking_code}>
                <Link href={`/portal/feedback/${f.tracking_code}`} className="group block">
                  <Card small className="transition-shadow group-hover:shadow-screenshot sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={f.status} />
                      <Badge>
                        {f.is_anonymous ? <EyeOff className="size-3.5" aria-hidden /> : <UserRound className="size-3.5" aria-hidden />}
                        {f.is_anonymous ? "Anonymous" : "With your name"}
                      </Badge>
                      <Badge>
                        <Icon className="size-3.5" aria-hidden />
                        {f.channel === "ocr" ? "Scanned" : f.channel === "voice" ? "Voice" : "Written"}
                      </Badge>
                      {f.hr_response && (
                        <Badge className="border-cobalt/30 text-cobalt">
                          <MessageSquareReply className="size-3.5" aria-hidden /> HR responded
                        </Badge>
                      )}
                      <span className="ml-auto font-mono text-xs tracking-wider text-pewter">{f.tracking_code}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-ink">
                      {f.summary ?? (f.processing_status === "failed" ? "Saved — summary unavailable." : "Being analysed…")}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-sm text-pewter">
                      <span>
                        {formatDate(f.created_at, { day: "numeric", month: "short", year: "numeric" })}
                        {(f.themes ?? []).length > 0 && ` · ${(f.themes ?? []).slice(0, 2).join(", ")}`}
                      </span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
