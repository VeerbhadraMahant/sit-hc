import { divergingColor } from "./scale";

/** Semi-circular −1…+1 sentiment gauge. Pure SVG, no client JS needed. */
export function SentimentGauge({ score, size = 96 }: { score: number | null; size?: number }) {
  const w = size;
  const h = size * 0.62;
  const r = size * 0.42;
  const cx = w / 2;
  const cy = h - 4;

  const angleFor = (s: number) => Math.PI - ((s + 1) / 2) * Math.PI; // -1 -> 180deg, +1 -> 0deg
  const point = (angle: number, radius: number) => ({ x: cx + radius * Math.cos(angle), y: cy - radius * Math.sin(angle) });

  const start = point(angleFor(-1), r);
  const end = point(angleFor(1), r);
  const track = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;

  const clamped = Math.max(-1, Math.min(1, score ?? 0));
  const needleAngle = angleFor(clamped);
  const tip = point(needleAngle, r - 6);
  const color = score == null ? "var(--color-pewter)" : divergingColor(clamped);

  return (
    <svg width={w} height={h + 4} viewBox={`0 0 ${w} ${h + 4}`} role="img" aria-label={score == null ? "Sentiment not yet analysed" : `Sentiment score ${clamped.toFixed(2)} of a possible range from -1 to 1`}>
      <path d={track} fill="none" stroke="var(--color-mist)" strokeWidth={size * 0.09} strokeLinecap="round" />
      {score != null && (
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${point(needleAngle, r).x} ${point(needleAngle, r).y}`}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.09}
          strokeLinecap="round"
        />
      )}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="var(--color-obsidian)" strokeWidth={2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={size * 0.045} fill="var(--color-obsidian)" />
    </svg>
  );
}
