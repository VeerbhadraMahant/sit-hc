"use client";

import { useState } from "react";
import { MOOD_LABELS, type CheckIn } from "@/lib/types";
import { formatDate } from "@/lib/utils";

// Categorical slots 1 & 2 from the validated dataviz palette (blue, orange).
const SERIES = [
  { key: "mood" as const, label: "Mood", color: "#2a78d6" },
  { key: "energy" as const, label: "Energy", color: "#eb6834" },
];

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 28 };

/** Personal 12-week mood & energy trend (1–5). Private to the employee. */
export function CheckinTrend({ items }: { items: CheckIn[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = [...items].sort((a, b) => a.week.localeCompare(b.week)).slice(-12);

  if (data.length < 2) {
    return (
      <p className="rounded-smallcards bg-mist/60 p-4 text-sm text-pewter">
        Check in for a couple of weeks and your personal trend will appear here.
      </p>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - 1) / 4) * innerH;
  const active = hover ?? data.length - 1;
  const point = data[active]!;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-ink" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="ml-auto text-pewter">
          {formatDate(point.week, { day: "numeric", month: "short" })} · Mood {point.mood} ({MOOD_LABELS[point.mood - 1]}) · Energy{" "}
          {point.energy}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Mood and energy over the last ${data.length} weeks`}
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--viz-grid)" strokeWidth={1} />
            <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--viz-axis)">
              {v}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
            <text key={d.week} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--viz-axis)">
              {formatDate(d.week, { day: "numeric", month: "short" })}
            </text>
          ) : null,
        )}
        <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-slate-edge)" strokeWidth={1} />
        {SERIES.map((s) => (
          <g key={s.key}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ")}
            />
            <circle cx={x(active)} cy={y(point[s.key])} r={5} fill={s.color} stroke="var(--color-paper-white)" strokeWidth={2} />
          </g>
        ))}
        {data.map((d, i) => (
          <rect
            key={d.week}
            x={x(i) - innerW / (data.length - 1) / 2}
            y={PAD.top}
            width={innerW / (data.length - 1)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            tabIndex={-1}
          >
            <title>{`${formatDate(d.week, { day: "numeric", month: "short" })}: mood ${d.mood}, energy ${d.energy}`}</title>
          </rect>
        ))}
      </svg>
      <table className="sr-only">
        <caption>Weekly check-ins</caption>
        <thead>
          <tr>
            <th>Week</th>
            <th>Mood</th>
            <th>Energy</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.week}>
              <td>{d.week}</td>
              <td>{d.mood}</td>
              <td>{d.energy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
