import type { EnpsBreakdown } from "@/lib/surveys";
import { cn } from "@/lib/utils";

/**
 * Ordinal answers use the diverging sentiment scale (docs/DESIGN.md → Data viz):
 * negative red ← neutral gray midpoint → positive blue. Every bar carries a
 * visible count + a hover title, so meaning never depends on color alone.
 */
export const SCALE_COLORS = ["#e34948", "#f0a3a2", "var(--viz-neutral)", "#86b6ef", "#2a78d6"];
export const ENPS_COLORS = { detractor: "#e34948", passive: "var(--viz-neutral)", promoter: "#2a78d6" };

export function enpsColor(score: number) {
  return score <= 6 ? ENPS_COLORS.detractor : score <= 8 ? ENPS_COLORS.passive : ENPS_COLORS.promoter;
}

/** Vertical column distribution (1–5 or 0–10). */
export function Distribution({
  counts,
  labels,
  colors,
  caption,
}: {
  counts: number[];
  labels: string[];
  colors: string[];
  caption?: [string | undefined, string | undefined];
}) {
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <figure>
      <div className="flex h-36 items-end gap-[2px]" role="img" aria-label={labels.map((l, i) => `${l}: ${counts[i]}`).join(", ")}>
        {counts.map((c, i) => (
          <div key={i} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${labels[i]}: ${c} (${total ? Math.round((c / total) * 100) : 0}%)`}>
            <span className="text-[11px] font-medium text-ink tabular-nums">{c || ""}</span>
            <div
              className="w-full max-w-12 rounded-t-[4px] transition-opacity group-hover:opacity-80"
              style={{ height: `${c ? Math.max(4, (c / max) * 100) : 0}%`, background: colors[i] }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] border-t border-edge pt-1">
        {labels.map((l) => (
          <span key={l} className="flex-1 text-center text-[11px] text-pewter tabular-nums">
            {l}
          </span>
        ))}
      </div>
      {caption && (caption[0] || caption[1]) && (
        <figcaption className="mt-1 flex justify-between text-[11px] text-pewter">
          <span>{caption[0]}</span>
          <span>{caption[1]}</span>
        </figcaption>
      )}
    </figure>
  );
}

/** eNPS headline + stacked detractor/passive/promoter bar with legend. */
export function EnpsSummary({ enps, className }: { enps: EnpsBreakdown; className?: string }) {
  const parts = [
    { key: "detractor", label: "Detractors (0–6)", n: enps.detractors, color: ENPS_COLORS.detractor },
    { key: "passive", label: "Passives (7–8)", n: enps.passives, color: ENPS_COLORS.passive },
    { key: "promoter", label: "Promoters (9–10)", n: enps.promoters, color: ENPS_COLORS.promoter },
  ];
  const pct = (n: number) => (enps.n ? Math.round((n / enps.n) * 100) : 0);
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline gap-3">
        <span className="text-[56px] leading-none font-semibold tracking-[-2px] text-obsidian tabular-nums">
          {enps.score === null ? "—" : enps.score > 0 ? `+${enps.score}` : enps.score}
        </span>
        <span className="text-sm text-pewter">eNPS · {enps.n} answers</span>
      </div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label}: ${pct(p.n)}%`).join(", ")}>
        {parts.map((p) =>
          p.n ? <div key={p.key} title={`${p.label}: ${p.n} (${pct(p.n)}%)`} style={{ width: `${pct(p.n)}%`, background: p.color }} /> : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-graphite">
        {parts.map((p) => (
          <li key={p.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: p.color }} aria-hidden />
            {p.label} <span className="font-medium text-ink tabular-nums">{pct(p.n)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 1–5 average → diverging fill for table cells. */
export function scaleCellColor(avg: number) {
  const t = Math.max(-1, Math.min(1, (avg - 3) / 2));
  return t < 0 ? `rgba(227,73,72,${0.12 + -t * 0.45})` : `rgba(42,120,214,${0.12 + t * 0.45})`;
}

export function enpsCellColor(score: number) {
  const t = Math.max(-1, Math.min(1, score / 60));
  return t < 0 ? `rgba(227,73,72,${0.12 + -t * 0.45})` : `rgba(42,120,214,${0.12 + t * 0.45})`;
}
