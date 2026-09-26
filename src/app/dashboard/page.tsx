import { AlertOctagon, AlertTriangle, ArrowRight, FileText, Inbox, Mic, ScanText } from "lucide-react";
import Link from "next/link";
import { BarList } from "@/components/dashboard/charts/bar-list";
import { SentimentHeatmap } from "@/components/dashboard/charts/heatmap";
import { formatScore } from "@/components/dashboard/charts/scale";
import { SentimentTrendChart } from "@/components/dashboard/charts/sentiment-trend";
import { StatTile } from "@/components/dashboard/stat-tile";
import { UrgencyBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { getOverview, parsePeriod, PERIODS } from "@/lib/dashboard-data";
import { getHrUser } from "@/lib/supabase/server";
import { RISK_LABELS, type RiskFlag } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export const metadata = { title: "Overview — Pulse HR" };

const CRITICAL_RISKS: RiskFlag[] = ["harassment", "discrimination", "safety", "ethics"];

const CHANNEL_META: Record<string, { label: string; Icon: typeof FileText }> = {
  text: { label: "Written", Icon: FileText },
  voice: { label: "Voice notes", Icon: Mic },
  ocr: { label: "Scanned / handwritten", Icon: ScanText },
};

function greeting() {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp.days);
  const [user, o] = await Promise.all([getHrUser(), getOverview(period)]);
  const { kpis } = o;
  const firstName = user?.fullName?.split(" ")[0];
  const sentimentDelta =
    kpis.avgSentiment != null && kpis.previousAvgSentiment != null ? kpis.avgSentiment - kpis.previousAvgSentiment : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Overview · last {period} days</p>
          <h1 className="text-heading-md font-semibold text-obsidian sm:text-heading">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <nav aria-label="Period" className="inline-flex items-center gap-1 self-start rounded-full border border-mist bg-paper p-1 shadow-[rgba(29,33,48,0.08)_0_0_0_1px] sm:self-auto">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/dashboard?days=${p}`}
              aria-current={p === period ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-navlinks px-4 text-sm font-medium",
                p === period ? "bg-carbon text-paper" : "text-ink hover:bg-mist",
              )}
            >
              {p}d
            </Link>
          ))}
        </nav>
      </div>

      {kpis.total === 0 ? (
        <Card className="grid-paper flex flex-col items-center py-16 text-center">
          <Inbox className="size-10 text-pewter" aria-hidden />
          <h2 className="mt-4 text-heading-sm font-semibold text-ink">No feedback in the last {period} days</h2>
          <p className="mt-1 max-w-md text-pewter">
            Share the employee link, or import paper forms and suggestion-box slips to get started.
          </p>
          <div className="mt-6 flex gap-3">
            <ButtonLink href="/submit">Open feedback form</ButtonLink>
            <ButtonLink href="/dashboard/import" variant="subtle">
              Import documents
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key metrics">
            <StatTile
              label="Feedback received"
              value={kpis.total}
              glow="cyan"
              delta={kpis.deltaPct != null ? { value: kpis.deltaPct, label: `${Math.abs(kpis.deltaPct).toFixed(0)}%` } : null}
              sub={<span>vs previous {period}d</span>}
            />
            <StatTile
              label="Avg sentiment"
              value={formatScore(kpis.avgSentiment)}
              glow="mint"
              delta={sentimentDelta != null ? { value: sentimentDelta, label: formatScore(sentimentDelta) } : null}
              sub={<span>{kpis.pctNegative != null ? `${kpis.pctNegative.toFixed(0)}% negative` : "scale −1 to +1"}</span>}
            />
            <StatTile
              label="Urgent & open"
              value={
                <span className="inline-flex items-center gap-2">
                  {kpis.openUrgent}
                  {kpis.openUrgent > 0 && (
                    <AlertOctagon className="size-7" style={{ color: "var(--status-critical)" }} aria-label="Needs attention" />
                  )}
                </span>
              }
              glow="orchid"
              sub={<span>critical + high, not yet actioned</span>}
            />
            <StatTile
              label="Response rate"
              value={kpis.responseRate != null ? `${kpis.responseRate.toFixed(0)}%` : "—"}
              glow="amber"
              sub={
                <span>
                  {kpis.medianHoursToRespond != null
                    ? `median ${kpis.medianHoursToRespond < 48 ? `${kpis.medianHoursToRespond.toFixed(0)}h` : `${(kpis.medianHoursToRespond / 24).toFixed(1)}d`} to respond`
                    : "no responses yet"}
                </span>
              }
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader eyebrow="Trend" title="Sentiment by week" />
              <SentimentTrendChart data={o.weekly} />
            </Card>

            <Card className="flex flex-col">
              <CardHeader
                eyebrow="Needs attention"
                title="Urgent & unresolved"
                action={
                  <Link href="/dashboard/feedback?urgency=critical" className="text-sm font-medium text-cobalt hover:underline">
                    View all
                  </Link>
                }
              />
              {o.needsAttention.length === 0 ? (
                <p className="text-pewter">Nothing urgent is waiting. Nice.</p>
              ) : (
                <ul className="-mx-2 flex-1 space-y-1">
                  {o.needsAttention.map((f) => (
                    <li key={f.id}>
                      <Link href={`/dashboard/feedback?id=${f.id}`} className="block rounded-smallcards px-2 py-2.5 hover:bg-mist/70">
                        <div className="flex items-center gap-2">
                          <UrgencyBadge urgency={f.urgency} />
                          <span className="truncate text-xs text-pewter">
                            {f.department ?? "Unspecified"} · {timeAgo(f.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-ink">{f.summary ?? "Awaiting analysis"}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader eyebrow="What people talk about" title="Top themes" />
              <BarList
                items={o.themes.slice(0, 8).map((t) => ({
                  label: t.theme,
                  value: t.count,
                  hint: `avg ${formatScore(t.avgSentiment)}`,
                  href: `/dashboard/feedback?theme=${encodeURIComponent(t.theme)}`,
                }))}
              />
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader eyebrow="Where it hurts" title="Department × theme sentiment" />
              <SentimentHeatmap {...o.heatmap} />
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader eyebrow="Risk radar" title="Flagged risks" />
              {o.risks.length === 0 ? (
                <p className="text-pewter">No risk flags in this period.</p>
              ) : (
                <BarList
                  items={o.risks.map((r) => {
                    const critical = CRITICAL_RISKS.includes(r.flag);
                    const Icon = critical ? AlertOctagon : AlertTriangle;
                    const color = critical ? "var(--status-critical)" : "var(--status-serious)";
                    return {
                      label: RISK_LABELS[r.flag] ?? r.flag,
                      value: r.count,
                      color,
                      icon: <Icon className="size-4 shrink-0" style={{ color }} aria-hidden />,
                      hint: critical ? "critical" : "serious",
                    };
                  })}
                />
              )}
            </Card>

            <Card>
              <CardHeader eyebrow="Channels" title="How feedback arrives" />
              <BarList
                items={o.channels.map((c) => {
                  const meta = CHANNEL_META[c.channel] ?? { label: c.channel, Icon: FileText };
                  return {
                    label: meta.label,
                    value: c.count,
                    icon: <meta.Icon className="size-4 shrink-0 text-ink" aria-hidden />,
                    hint: `${((c.count / kpis.total) * 100).toFixed(0)}%`,
                    href: `/dashboard/feedback?channel=${c.channel}`,
                  };
                })}
              />
              <div className="mt-6 border-t border-mist pt-4">
                <p className="eyebrow mb-2">By department</p>
                <ul className="space-y-1.5 text-sm">
                  {o.departments.slice(0, 5).map((d) => (
                    <li key={d.department} className="flex items-center justify-between gap-2">
                      <Link href={`/dashboard/feedback?department=${encodeURIComponent(d.department)}`} className="truncate text-ink hover:text-cobalt">
                        {d.department}
                      </Link>
                      <span className="text-pewter tabular-nums">
                        {d.count} · {formatScore(d.avgSentiment)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader eyebrow="Emotional tone" title="How people feel" />
              {o.emotions.length === 0 ? (
                <p className="text-pewter">No emotions detected yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {o.emotions.map((e, i) => (
                    <li
                      key={e.emotion}
                      className="inline-flex items-center gap-1.5 rounded-full border border-mist px-3 py-1 text-ink capitalize"
                      style={{ fontSize: `${Math.max(12, 16 - i * 0.35)}px` }}
                    >
                      {e.emotion}
                      <span className="text-xs text-pewter tabular-nums">{e.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/dashboard/insights"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-cobalt hover:underline"
              >
                Generate an AI insight report <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
