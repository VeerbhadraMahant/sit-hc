import { AlertTriangle, TrendingDown } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { DiscontentDriver } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const SENTIMENT_COLORS: Record<string, string> = {
  0: "bg-red-500",
  1: "bg-orange-400",
  2: "bg-amber-400",
};

function DriverRow({
  driver,
  rank,
  maxScore,
}: {
  driver: DiscontentDriver;
  rank: number;
  maxScore: number;
}) {
  const pct = maxScore > 0 ? Math.min(100, (driver.score / maxScore) * 100) : 0;
  const barColor = SENTIMENT_COLORS[rank] ?? "bg-red-300";
  const isDeep = driver.avgSentiment != null && driver.avgSentiment < -0.6;

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
              rank === 0 ? "bg-red-500" : rank === 1 ? "bg-orange-400" : "bg-amber-400",
            )}
          >
            {rank + 1}
          </span>
          <span className="truncate text-sm font-medium text-ink">{driver.theme}</span>
          {isDeep && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
              <AlertTriangle className="size-2.5" aria-hidden />
              Deep
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-pewter">{driver.pctOfNegative.toFixed(0)}% of negative</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
        <div
          className={cn("h-2 rounded-full transition-all", barColor)}
          style={{ width: `${Math.max(4, pct)}%` }}
          aria-label={`${driver.pctOfNegative.toFixed(0)}% of negative sentiment`}
        />
      </div>

      <p className="text-xs text-pewter">
        {driver.negativeCount} negative mention{driver.negativeCount !== 1 ? "s" : ""}
        {driver.avgSentiment != null ? ` · avg score ${driver.avgSentiment.toFixed(2)}` : ""}
      </p>
    </li>
  );
}

export function DiscontentDrivers({
  drivers,
  wellbeingMood,
  className,
}: {
  drivers: DiscontentDriver[];
  wellbeingMood?: number | null;
  className?: string;
}) {
  return (
    <Card glow="orchid" arc className={cn("flex flex-col", className)}>
      <CardHeader
        eyebrow="Discontent Driver Analysis"
        title="Primary sources of negativity"
        action={
          wellbeingMood != null && wellbeingMood < 3.0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
              <TrendingDown className="size-3" aria-hidden />
              Low Mood Correlation
            </span>
          ) : null
        }
      />

      {drivers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <TrendingDown className="size-8 text-pewter" aria-hidden />
          <p className="text-sm text-pewter">No negative feedback in this period.</p>
          <p className="text-xs text-pewter/70">Discontent drivers appear once negative sentiment is detected.</p>
        </div>
      ) : (
        <ul className="space-y-5">
          {drivers.map((d, i) => (
            <DriverRow key={d.theme} driver={d} rank={i} maxScore={drivers[0]?.score ?? 1} />
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-pewter/70">
        Score = |avg sentiment| × volume · higher = more severe + more frequent
      </p>
    </Card>
  );
}
