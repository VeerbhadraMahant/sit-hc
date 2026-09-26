import { AlertTriangle, CircleCheck, Info } from "lucide-react";
import { BarList } from "@/components/dashboard/charts/bar-list";
import { formatScore } from "@/components/dashboard/charts/scale";
import { SentimentGauge } from "@/components/dashboard/charts/sentiment-gauge";
import { Card } from "@/components/ui/card";
import { getFeedbackSummary, type FeedbackFilters } from "@/lib/dashboard-data";

export async function FeedbackSummaryStrip({ filters, filtered }: { filters: FeedbackFilters; filtered: boolean }) {
  const s = await getFeedbackSummary(filters);

  if (s.total === 0) return null;

  return (
    <Card className="grid gap-6 sm:grid-cols-[auto_1fr_1fr]">
      <div className="flex items-center gap-4">
        <SentimentGauge score={s.avgSentiment} size={84} />
        <div>
          <p className="eyebrow">{filtered ? "Filtered overview" : "Overview"}</p>
          <p className="text-2xl leading-none font-semibold tabular-nums text-obsidian">{formatScore(s.avgSentiment)}</p>
          <p className="mt-1 text-xs text-pewter">
            avg. sentiment across <span className="font-medium text-ink">{s.total}</span> {s.total === 1 ? "item" : "items"}
            {s.pendingAnalysis > 0 && <> · {s.pendingAnalysis} still analysing</>}
          </p>
        </div>
      </div>

      <div>
        <p className="eyebrow mb-2">Sentiment breakdown</p>
        <BarList
          max={s.total}
          items={[
            { label: "Positive", value: s.sentiment.positive, color: "var(--viz-positive)" },
            { label: "Neutral / mixed", value: s.sentiment.neutral, color: "var(--viz-neutral)" },
            { label: "Negative", value: s.sentiment.negative, color: "var(--viz-negative)" },
          ]}
        />
      </div>

      <div>
        <p className="eyebrow mb-2">Urgency breakdown</p>
        <BarList
          max={s.total}
          items={[
            { label: "Low", value: s.urgency.low, color: "var(--status-good)", icon: <CircleCheck className="size-3.5" style={{ color: "var(--status-good)" }} aria-hidden /> },
            { label: "Medium", value: s.urgency.medium, color: "var(--status-warning)", icon: <Info className="size-3.5" style={{ color: "var(--status-warning)" }} aria-hidden /> },
            { label: "High", value: s.urgency.high, color: "var(--status-serious)", icon: <AlertTriangle className="size-3.5" style={{ color: "var(--status-serious)" }} aria-hidden /> },
            { label: "Critical", value: s.urgency.critical, color: "var(--status-critical)", icon: <AlertTriangle className="size-3.5" style={{ color: "var(--status-critical)" }} aria-hidden /> },
          ]}
        />
      </div>
    </Card>
  );
}

export function FeedbackSummarySkeleton() {
  return <div className="h-[148px] animate-pulse rounded-cards bg-mist" aria-busy="true" aria-label="Loading overview" />;
}
