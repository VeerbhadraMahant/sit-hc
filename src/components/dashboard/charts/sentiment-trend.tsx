"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { WeeklySentiment } from "@/lib/dashboard-data";

const SERIES = [
  { key: "negative", label: "Negative", color: "var(--viz-negative)" },
  { key: "neutral", label: "Neutral / mixed", color: "var(--viz-neutral)" },
  { key: "positive", label: "Positive", color: "var(--viz-positive)" },
] as const;

const fmtWeek = (w: string) => new Date(w + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function TooltipBox({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as WeeklySentiment;
  return (
    <div className="rounded-smallcards bg-paper px-3 py-2 text-sm shadow-card">
      <p className="mb-1 font-medium text-ink">Week of {fmtWeek(String(label))}</p>
      {[...SERIES].reverse().map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-6 text-ink">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="tabular-nums">{row[s.key]}</span>
        </p>
      ))}
      <p className="mt-1 border-t border-mist pt-1 text-pewter">Total {row.total}</p>
    </div>
  );
}

export function SentimentTrendChart({ data }: { data: WeeklySentiment[] }) {
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-4 text-sm text-ink" aria-label="Legend">
        {[...SERIES].reverse().map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
            <XAxis
              dataKey="week"
              tickFormatter={fmtWeek}
              tick={{ fill: "var(--viz-axis)", fontSize: 12 }}
              axisLine={{ stroke: "var(--color-slate-edge)" }}
              tickLine={false}
              minTickGap={12}
            />
            <YAxis allowDecimals={false} tick={{ fill: "var(--viz-axis)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={(p) => <TooltipBox {...(p as TooltipContentProps<number, string>)} />} cursor={{ fill: "rgba(29,33,48,0.04)" }} />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="s"
                fill={s.color}
                stroke="var(--color-paper-white)"
                strokeWidth={2}
                radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
