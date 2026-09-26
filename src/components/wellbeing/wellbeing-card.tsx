import { EyeOff, HeartPulse } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getWellbeing, type WellbeingRow } from "./data";

const SERIES = [
  { key: "avg_mood", label: "Mood", color: "#2a78d6" },
  { key: "avg_energy", label: "Energy", color: "#eb6834" },
] as const;

/**
 * Self-contained HR overview card: org-wide weekly mood/energy (1–5) from employee
 * check-ins + departments for the latest week. Only groups of 5+ people are ever
 * returned by the wellbeing_aggregates RPC.
 */
export async function WellbeingCard({ weeks = 8, className }: { weeks?: number; className?: string }) {
  const { org, departments, departmentsWeek, latest, previous } = await getWellbeing(weeks);
  const delta = latest && previous ? latest.avg_mood - previous.avg_mood : null;

  return (
    <Card glow="mint" arc className={className}>
      <CardHeader
        eyebrow="Wellbeing check-ins"
        title="How people are feeling"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs text-pewter" title="Groups under 5 people are hidden to protect anonymity">
            <EyeOff className="size-3.5" aria-hidden /> k ≥ 5
          </span>
        }
      />
      {!latest ? (
        <div className="flex items-center gap-3 rounded-smallcards border border-dashed border-edge p-4 text-sm text-pewter">
          <HeartPulse className="size-5 shrink-0" aria-hidden />
          Not enough check-ins yet. Results appear once at least 5 people check in in a week.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <Metric label="Mood this week" value={latest.avg_mood} delta={delta} />
            <Metric label="Energy" value={latest.avg_energy} />
            <div>
              <p className="text-xs text-pewter">Checked in</p>
              <p className="text-heading-sm leading-tight font-semibold text-obsidian tabular-nums">{latest.respondents}</p>
            </div>
          </div>
          <TrendChart rows={org} />
          {departments.length > 0 && (
            <div>
              <p className="eyebrow mb-2">By department · week of {formatDate(departmentsWeek!)}</p>
              <ul className="space-y-2">
                {departments.map((d) => (
                  <DeptRow key={d.department} row={d} />
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-pewter">Teams with fewer than 5 check-ins in a week are hidden, so no individual can be singled out.</p>
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, delta }: { label: string; value: number; delta?: number | null }) {
  return (
    <div>
      <p className="text-xs text-pewter">{label}</p>
      <p className="text-heading-sm leading-tight font-semibold text-obsidian tabular-nums">
        {value.toFixed(1)}
        <span className="text-sm font-normal text-pewter">/5</span>
        {delta !== undefined && delta !== null && Math.abs(delta) >= 0.05 && (
          <span className="ml-2 text-sm font-medium" style={{ color: delta > 0 ? "#006300" : "var(--status-critical)" }}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
          </span>
        )}
      </p>
    </div>
  );
}

function DeptRow({ row }: { row: WellbeingRow }) {
  const pct = ((row.avg_mood - 1) / 4) * 100;
  const low = row.avg_mood < 3;
  return (
    <li className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3 text-sm" title={`${row.department}: mood ${row.avg_mood.toFixed(2)}, energy ${row.avg_energy.toFixed(2)} · ${row.respondents} people`}>
      <span className="truncate text-ink">{row.department}</span>
      <span className="h-2 rounded-full bg-mist">
        <span className="block h-2 rounded-full" style={{ width: `${Math.max(3, pct)}%`, background: low ? "var(--viz-negative)" : "var(--viz-positive)" }} />
      </span>
      <span className="text-pewter tabular-nums">
        <span className="font-medium text-ink">{row.avg_mood.toFixed(1)}</span> · {row.respondents}p
      </span>
    </li>
  );
}

/** Two thin lines on a fixed 1–5 axis, legend + direct end labels, native tooltips per point. */
function TrendChart({ rows }: { rows: WellbeingRow[] }) {
  const W = 560;
  const H = 150;
  const pad = { l: 26, r: 76, t: 10, b: 22 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (rows.length <= 1 ? iw / 2 : (i / (rows.length - 1)) * iw);
  const y = (v: number) => pad.t + ((5 - v) / 4) * ih;

  const last = rows.at(-1);
  const MIN_LABEL_GAP = 15;
  const labelPositions: Record<string, number> = (() => {
    if (!last) return {};
    const items = SERIES.map((s) => ({
      key: s.key,
      y: y(last[s.key]),
    })).sort((a, b) => a.y - b.y);

    if (items.length >= 2) {
      const [top, bottom] = items;
      const diff = bottom.y - top.y;
      if (diff < MIN_LABEL_GAP) {
        const overlap = MIN_LABEL_GAP - diff;
        top.y -= overlap / 2;
        bottom.y -= overlap / 2;

        if (top.y < pad.t + 4) {
          const shift = pad.t + 4 - top.y;
          top.y += shift;
          bottom.y += shift;
        } else if (bottom.y > H - pad.b) {
          const shift = bottom.y - (H - pad.b);
          top.y -= shift;
          bottom.y -= shift;
        }
      }
    }

    return Object.fromEntries(items.map((item) => [item.key, item.y]));
  })();

  return (
    <figure>
      <ul className="mb-2 flex gap-4 text-xs text-graphite">
        {SERIES.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Weekly average mood and energy, 1 to 5">
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--viz-grid)" strokeWidth={1} />
            <text x={pad.l - 8} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--viz-axis)">
              {v}
            </text>
          </g>
        ))}
        {rows.map((r, i) =>
          i % Math.ceil(rows.length / 6) === 0 || i === rows.length - 1 ? (
            <text key={r.week} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--viz-axis)">
              {formatDate(r.week)}
            </text>
          ) : null,
        )}
        {SERIES.map((s) => {
          const pts = rows.map((r, i) => `${x(i)},${y(r[s.key])}`).join(" ");
          const lastPoint = rows.at(-1)!;
          const labelY = labelPositions[s.key] ?? y(lastPoint[s.key]);
          return (
            <g key={s.key}>
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {rows.map((r, i) => (
                <circle key={r.week} cx={x(i)} cy={y(r[s.key])} r={4} fill={s.color} stroke="var(--color-paper-white)" strokeWidth={2}>
                  <title>{`Week of ${formatDate(r.week)} · ${s.label} ${r[s.key].toFixed(2)} · ${r.respondents} people`}</title>
                </circle>
              ))}
              <text x={x(rows.length - 1) + 8} y={labelY + 3.5} fontSize={11} fontWeight={500} fill="var(--color-midnight-ink)">
                {s.label} {lastPoint[s.key].toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
