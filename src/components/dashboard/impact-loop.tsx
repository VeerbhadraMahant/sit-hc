import { ArrowRight, CheckCircle2, Megaphone, MinusCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { getImpactLoop, type ImpactLoopResult } from "@/lib/dashboard-data";
import { cn, formatDate } from "@/lib/utils";

/** Fetches its own data so the overview page's first paint doesn't wait on this
 * (last-section, below-the-fold) query — render this inside a <Suspense>. */
export async function ImpactLoopSection({ className }: { className?: string }) {
  const results = await getImpactLoop();
  return <ImpactLoop results={results} className={className} />;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-pewter">
        <MinusCircle className="size-3" aria-hidden />
        Measuring…
      </span>
    );
  }
  if (delta > 0.02) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold"
        style={{ background: "color-mix(in srgb, var(--status-good) 12%, white)", color: "var(--status-good)" }}
      >
        <CheckCircle2 className="size-3.5" aria-hidden />+{delta.toFixed(2)} pts
      </span>
    );
  }
  if (delta < -0.02) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold"
        style={{ background: "color-mix(in srgb, var(--status-critical) 10%, white)", color: "var(--status-critical)" }}
      >
        <XCircle className="size-3.5" aria-hidden />
        {delta.toFixed(2)} pts
      </span>
    );
  }
  // Neutral result — no change is neither good nor bad, so it stays in the same
  // grey the app uses for "no data", not the warning color.
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1.5 text-sm font-medium text-pewter">
      <MinusCircle className="size-3.5" aria-hidden />
      No change
    </span>
  );
}

function ImpactRow({ result }: { result: ImpactLoopResult }) {
  const hasData = result.avgSentimentBefore != null || result.avgSentimentAfter != null;
  return (
    <li className="flex flex-col gap-1.5 rounded-smallcards border border-mist p-3 hover:bg-mist/40 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{result.updateTitle}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge>{result.theme}</Badge>
            {result.department && <Badge className="text-pewter">{result.department}</Badge>}
            <span className="text-xs text-pewter">{formatDate(result.publishedAt, { day: "numeric", month: "short" })}</span>
          </div>
        </div>
        <DeltaBadge delta={result.sentimentDelta} />
      </div>

      {hasData && (
        <div className="flex items-center gap-2 text-xs text-pewter">
          <span
            className="tabular-nums"
            style={
              result.avgSentimentBefore != null && result.avgSentimentBefore < -0.2
                ? { color: "var(--status-critical)", fontWeight: 500 }
                : undefined
            }
          >
            Before: {result.avgSentimentBefore != null ? result.avgSentimentBefore.toFixed(2) : "–"}
          </span>
          <ArrowRight className="size-3 shrink-0" aria-hidden />
          <span
            className="tabular-nums"
            style={
              result.avgSentimentAfter != null && result.avgSentimentAfter > result.avgSentimentBefore!
                ? { color: "var(--status-good)", fontWeight: 500 }
                : undefined
            }
          >
            After: {result.avgSentimentAfter != null ? result.avgSentimentAfter.toFixed(2) : "–"}
          </span>
          <span className="ml-auto text-pewter/70">
            {result.feedbackCountBefore}→{result.feedbackCountAfter} responses
          </span>
        </div>
      )}

      {!hasData && (
        <p className="text-xs text-pewter">
          Not enough feedback yet to measure impact (need ≥3 responses before &amp; after).
        </p>
      )}
    </li>
  );
}

export function ImpactLoop({
  results,
  className,
}: {
  results: ImpactLoopResult[];
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        eyebrow="Impact loop"
        title="Did our actions move the needle?"
        action={
          <Link
            href="/dashboard/updates"
            className="text-sm font-medium text-cobalt hover:underline"
          >
            Manage updates
          </Link>
        }
      />

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-lime/20 text-obsidian">
            <Megaphone className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">No tracked actions yet</p>
            <p className="mt-1 max-w-xs text-xs text-pewter">
              Publish a &ldquo;You said, we did&rdquo; update with a Theme selected to start tracking sentiment recovery.
            </p>
          </div>
          <Link
            href="/dashboard/updates"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-cobalt hover:underline"
          >
            Publish first update <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {results.slice(0, 5).map((r) => (
              <ImpactRow key={r.updateId} result={r} />
            ))}
          </ul>
          <p className="mt-4 text-xs text-pewter/70">
            Compares avg sentiment on each theme in the 30 days before vs after the update was published.
            Needs ≥3 responses per window.
          </p>
        </>
      )}
    </Card>
  );
}
