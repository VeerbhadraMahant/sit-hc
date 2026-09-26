import { AlertTriangle, CircleCheck, TrendingDown } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { DiscontentDriver } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

/** Color reflects how negative this theme actually is, not its rank in the list. */
function severityColor(avgSentiment: number | null) {
  if (avgSentiment == null) return "var(--status-serious)";
  if (avgSentiment <= -0.6) return "var(--status-critical)";
  if (avgSentiment <= -0.3) return "var(--status-serious)";
  return "var(--status-warning)";
}

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
  const color = severityColor(driver.avgSentiment);
  const isSevere = driver.avgSentiment != null && driver.avgSentiment < -0.6;

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: color }}
          >
            {rank + 1}
          </span>
          <span className="truncate text-sm font-medium text-ink">{driver.theme}</span>
          {isSevere && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: "color-mix(in srgb, var(--status-critical) 10%, white)", color: "var(--status-critical)" }}
            >
              <AlertTriangle className="size-2.5" aria-hidden />
              Severe
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-pewter">{driver.pctOfNegative.toFixed(0)}% of negative</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${Math.max(4, pct)}%`, background: color }}
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
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        eyebrow="Discontent drivers"
        title="Primary sources of negativity"
        action={
          wellbeingMood != null && wellbeingMood < 3.0 ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
              style={{ background: "color-mix(in srgb, var(--status-critical) 10%, white)", color: "var(--status-critical)" }}
            >
              <TrendingDown className="size-3" aria-hidden />
              Low mood correlation
            </span>
          ) : null
        }
      />

      {drivers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CircleCheck className="size-8 text-pewter" aria-hidden />
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
