"use client";

import {
  ArrowUpRight,
  CalendarRange,
  Check,
  Clock,
  FileDown,
  Loader2,
  Mail,
  Quote,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, UrgencyBadge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublishUpdateButton } from "@/components/updates/publish-update-button";
import { Select } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/pill-tabs";
import { DEPARTMENTS, type InsightReport } from "@/lib/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";

type Range = "7" | "30" | "90";

const PRIORITY_META = {
  P1: { label: "P1 · Now", glow: "critical" as const, hint: "Urgent risk or broad impact" },
  P2: { label: "P2 · Next", glow: "warning" as const, hint: "Important, plan this month" },
  P3: { label: "P3 · Later", glow: "good" as const, hint: "Improvements to schedule" },
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

/** Wrap the longest word of the headline in the brushstroke. */
function BrushHeadline({ text }: { text: string }) {
  const words = text.split(" ");
  let idx = 0;
  words.forEach((w, i) => {
    if (w.replace(/\W/g, "").length > words[idx].replace(/\W/g, "").length) idx = i;
  });
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          {i === idx ? <span className="brush">{w}</span> : w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

function useDoneActions(reportId: string | undefined) {
  const storageKey = reportId ? `vocalyze:actions:${reportId}` : null;
  const [done, setDone] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (!storageKey) return;
    try {
      // One-time migration from the pre-rename key.
      const legacyKey = storageKey.replace(/^vocalyze:/, "pulse:");
      let saved = localStorage.getItem(storageKey);
      if (saved === null) {
        saved = localStorage.getItem(legacyKey);
        if (saved !== null) {
          localStorage.setItem(storageKey, saved);
          localStorage.removeItem(legacyKey);
        }
      }
      setDone(JSON.parse(saved ?? "{}"));
    } catch {
      setDone({});
    }
  }, [storageKey]);
  const toggle = (i: number) =>
    setDone((prev) => {
      const next = { ...prev, [i]: !prev[i] };
      try {
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage unavailable — keep in memory */
      }
      return next;
    });
  return { done, toggle };
}

/** Typical end-to-end generation time (thinking LOW, ≤150 prompt items); paces the progress steps. */
const EXPECTED_MS = 15_000;
/** Fraction of EXPECTED_MS at which each step starts. The last step stays active until the report lands. */
const STEP_AT = [0, 0.12, 0.35, 0.6, 0.85];

const STEPS = (n: number) => [
  `Reading ${n || "recent"} feedback items…`,
  "Clustering themes and risk signals…",
  "Comparing against the previous period…",
  "Drafting prioritised actions…",
  "Polishing the leadership briefing…",
];

export function InsightsView({
  initialReports,
  initialReportId,
  recentCount,
}: {
  initialReports: InsightReport[];
  initialReportId: string | null;
  recentCount: number;
}) {
  const [reports, setReports] = useState(initialReports);
  const [selectedId, setSelectedId] = useState<string | null>(initialReportId ?? initialReports[0]?.id ?? null);
  const [range, setRange] = useState<Range>("30");
  const [department, setDepartment] = useState("");
  const [generating, setGenerating] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [emailing, setEmailing] = useState(false);

  const report = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );
  const { done, toggle } = useDoneActions(report?.id);

  useEffect(() => {
    if (!generating) return;
    const startedAt = Date.now();
    setElapsedMs(0);
    const t = setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => clearInterval(t);
  }, [generating]);
  // Steps advance with real elapsed time, never past the final step before the server responds.
  const step = STEP_AT.reduce((acc, at, i) => (elapsedMs >= at * EXPECTED_MS ? i : acc), 0);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range: Number(range), department: department || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not generate report");
      setReports((prev) => [json.report, ...prev]);
      setSelectedId(json.report.id);
      toast.success("New insight report ready");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function emailReport() {
    if (!report) return;
    setEmailing(true);
    try {
      const res = await fetch(`/api/insights/${report.id}/email`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Email failed");
      toast.success(`Report emailed to ${json.to}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEmailing(false);
    }
  }

  const concerns = report
    ? [...report.top_concerns].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    : [];
  const actionsByPriority = (["P1", "P2", "P3"] as const).map((p) => ({
    priority: p,
    items: (report?.action_items ?? []).map((a, i) => ({ ...a, i })).filter((a) => a.priority === p),
  }));
  const doneCount = Object.values(done).filter(Boolean).length;

  return (
    <div className="insights-print space-y-8">
      {/* Header */}
      <div>
        <p className="eyebrow">AI insight reports</p>
        <h1 className="text-heading-md font-semibold text-obsidian sm:text-heading">What your people are telling you</h1>
        <p className="mt-3 max-w-xl text-pewter">
          Vocalyze reads every analysed piece of feedback, finds the patterns and turns them into a briefing you can take
          to leadership. <span className="font-semibold text-ink">{recentCount} items</span> analysed in the last 30 days.
        </p>
      </div>

      {/* Controls — full-width toolbar, not a cramped side card */}
      <Card className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="eyebrow shrink-0">Period</span>
          <PillTabs
            value={range}
            onChange={setRange}
            tabs={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ]}
          />
          <Select
            aria-label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-11 w-full sm:w-auto sm:min-w-48"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </div>
        <Button onClick={generate} disabled={generating} className="w-full sm:w-auto">
          {generating ? <Loader2 className="size-4 animate-spin" /> : report ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
          {report ? "Generate new report" : "Generate report"}
        </Button>
      </Card>

      {generating && (
        <Card glow="cyan" arc className="print:hidden">
          <div className="flex items-start gap-4">
            <div className="relative mt-1 flex size-10 shrink-0 items-center justify-center">
              <span className="animate-pulse-ring absolute inset-0 rounded-full bg-cyan/40" />
              <Sparkles className="relative size-5 text-ink" />
            </div>
            <ol className="flex-1 space-y-2">
              {STEPS(recentCount).map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex items-center gap-2 text-sm transition-opacity",
                    i < step ? "text-ink" : i === step ? "font-medium text-obsidian" : "text-pewter/60",
                  )}
                >
                  {i < step ? (
                    <Check className="size-4 text-good" />
                  ) : i === step ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <span className="size-4" />
                  )}
                  {s}
                </li>
              ))}
            </ol>
            <span className="font-mono text-xs text-pewter tabular-nums" aria-live="off">
              {(elapsedMs / 1000).toFixed(0)}s
            </span>
          </div>
        </Card>
      )}

      {!report && !generating && (
        <Card className="grid-paper flex flex-col items-center py-16 text-center">
          <Sparkles className="mb-4 size-8 text-ink" />
          <h2 className="text-heading-sm font-semibold text-ink">No reports yet</h2>
          <p className="mt-2 max-w-md text-pewter">
            Generate your first briefing. It takes around 15 seconds and summarises themes, risks and recommended actions.
          </p>
          <Button className="mt-6" onClick={generate}>
            <Sparkles className="size-4" /> Generate report
          </Button>
        </Card>
      )}

      {report && (
        <div className={cn("grid gap-8 lg:grid-cols-[1fr_280px]", generating && "opacity-50")}>
          <div className="space-y-8">
            {/* Headline */}
            <Card className="grid-paper relative overflow-hidden p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>
                  <CalendarRange className="size-3.5" />
                  {formatDate(report.period_start)} – {formatDate(report.period_end, { day: "numeric", month: "short", year: "numeric" })}
                </Badge>
                <Badge>
                  <Users className="size-3.5" />
                  {report.department ?? "All departments"}
                </Badge>
                <Badge>{report.feedback_count} feedback items</Badge>
              </div>
              <h2 className="mt-6 max-w-3xl text-heading-md font-semibold text-obsidian sm:text-[40px] sm:leading-[1.05] sm:tracking-[-0.8px]">
                <BrushHeadline text={report.headline} />
              </h2>
              <p className="mt-6 max-w-3xl text-subheading text-carbon">{report.executive_summary}</p>
              <div className="mt-6 flex flex-wrap gap-3 print:hidden">
                <a href={`/api/insights/${report.id}/pdf`} className={buttonClass("primary", "md")} download>
                  <FileDown className="size-4" /> Download PDF report
                </a>
                <Button variant="subtle" onClick={emailReport} disabled={emailing}>
                  {emailing ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  Email to leadership
                </Button>
              </div>
            </Card>

            {/* Concerns */}
            <section>
              <p className="eyebrow">Top concerns</p>
              <h3 className="mb-4 text-heading-sm font-semibold text-ink">Where attention is needed</h3>
              {concerns.length === 0 ? (
                <p className="text-pewter">No significant concerns in this period.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {concerns.map((c, i) => (
                    <Card
                      key={i}
                      glow={c.severity === "critical" ? "critical" : undefined}
                      arc={c.severity === "critical"}
                      className={cn(
                        "flex flex-col break-inside-avoid",
                        c.severity === "critical"
                          ? "border border-red-200/90 bg-gradient-to-b from-red-500/[0.04] to-paper"
                          : c.severity === "high"
                          ? "border border-amber-200/80 bg-gradient-to-b from-amber-500/[0.02] to-paper"
                          : "",
                      )}
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <UrgencyBadge urgency={c.severity} />
                        <Badge>{c.theme}</Badge>
                        <span className="ml-auto font-mono text-xs text-pewter">{c.mention_count} mentions</span>
                      </div>
                      <h4 className="text-lg font-semibold tracking-tight text-obsidian">{c.title}</h4>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-carbon">{c.description}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-mist pt-3">
                        {c.departments.map((d) => (
                          <span key={d} className="text-xs text-pewter">
                            {d}
                          </span>
                        ))}
                        {(c.evidence_ids?.length ?? 0) > 0 && (
                          <details className="ml-auto text-sm print:hidden">
                            <summary className="cursor-pointer font-medium text-cobalt">
                              View evidence ({c.evidence_ids?.length})
                            </summary>
                            <ul className="mt-2 space-y-1">
                              {c.evidence_ids.slice(0, 8).map((id, j) => (
                                <li key={id}>
                                  <Link
                                    href={`/dashboard/feedback?id=${id}`}
                                    className="inline-flex items-center gap-1 text-xs text-cobalt hover:underline"
                                  >
                                    Feedback #{j + 1} <ArrowUpRight className="size-3" />
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Actions */}
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Recommended actions</p>
                  <h3 className="text-heading-sm font-semibold text-ink">Your action plan</h3>
                </div>
                {report.action_items.length > 0 && (
                  <span className="text-sm text-pewter">
                    {doneCount}/{report.action_items.length} done
                  </span>
                )}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {actionsByPriority.map(({ priority, items }) => (
                  <Card key={priority} glow={PRIORITY_META[priority].glow} arc className="break-inside-avoid">
                    <p className="font-mono text-xs font-medium tracking-[2px] text-ink uppercase">
                      {PRIORITY_META[priority].label}
                    </p>
                    <p className="mb-4 text-xs text-pewter">{PRIORITY_META[priority].hint}</p>
                    {items.length === 0 ? (
                      <p className="text-sm text-pewter/80">Nothing at this priority.</p>
                    ) : (
                      <ul className="space-y-3">
                        {items.map((a) => (
                          <li key={a.i} className="rounded-smallcards border border-mist bg-white/60 p-3">
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                checked={!!done[a.i]}
                                onChange={() => toggle(a.i)}
                                className="mt-1 size-4 shrink-0 accent-[#151720]"
                              />
                              <span>
                                <span
                                  className={cn(
                                    "block font-medium text-obsidian",
                                    done[a.i] && "text-pewter line-through",
                                  )}
                                >
                                  {a.title}
                                </span>
                                {a.root_cause && (
                                  <span className="mt-1.5 flex items-start gap-1.5 rounded-smallcards border border-amber/40 bg-amber-card/35 px-2.5 py-1.5 text-xs leading-snug font-medium text-graphite">
                                    <Quote className="mt-0.5 size-3 shrink-0 text-graphite/70" aria-hidden />
                                    {a.root_cause}
                                  </span>
                                )}
                                <span className="mt-1.5 block text-sm text-carbon">{a.description}</span>
                                <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-pewter">
                                  <span className="inline-flex items-center gap-1">
                                    <Users className="size-3" /> {a.owner}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="size-3" /> {a.timeframe}
                                  </span>
                                </span>
                                <span className="mt-1 block text-xs text-graphite">Impact: {a.expected_impact}</span>
                                {a.evidence_ids.length > 0 && (
                                  <details className="mt-2 text-xs">
                                    <summary className="cursor-pointer font-medium text-cobalt">
                                      View evidence ({a.evidence_ids.length})
                                    </summary>
                                    <ul className="mt-1 space-y-1">
                                      {a.evidence_ids.slice(0, 5).map((id, j) => (
                                        <li key={id}>
                                          <Link
                                            href={`/dashboard/feedback?id=${id}`}
                                            className="inline-flex items-center gap-1 text-cobalt hover:underline"
                                          >
                                            Feedback #{j + 1} <ArrowUpRight className="size-3" />
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                )}
                              </span>
                            </label>
                            <PublishUpdateButton
                              action={{ title: a.title, description: a.description }}
                              className="mt-2 ml-7"
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))}
              </div>
            </section>

            {/* Positives */}
            {report.positives.length > 0 && (
              <section>
                <p className="eyebrow">Bright spots</p>
                <h3 className="mb-4 text-heading-sm font-semibold text-ink">What&apos;s working</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {report.positives.map((p, i) => (
                    <Card key={i} glow="good" arc className="break-inside-avoid">
                      <Sparkles className="mb-3 size-5 text-ink" />
                      <h4 className="font-semibold text-obsidian">{p.title}</h4>
                      <p className="mt-1 text-sm text-carbon">{p.description}</p>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* History */}
          <aside className="print:hidden">
            <p className="eyebrow">Report history</p>
            <ul className="mt-2 space-y-2">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      "w-full cursor-pointer rounded-smallcards p-3 text-left transition-colors",
                      r.id === report.id ? "bg-carbon text-paper" : "shadow-field hover:bg-mist",
                    )}
                  >
                    <span className="line-clamp-2 text-sm font-medium">{r.headline}</span>
                    <span className={cn("mt-1 block text-xs", r.id === report.id ? "text-silver" : "text-pewter")}>
                      {r.department ?? "All departments"} · {timeAgo(r.created_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      <style>{`
        @media print {
          header, nav { display: none !important; }
          body { background: #fff; }
          .insights-print .shadow-card { box-shadow: none !important; border: 1px solid #ebeef7; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
