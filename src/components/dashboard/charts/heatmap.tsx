import Link from "next/link";
import type { HeatCell } from "@/lib/dashboard-data";
import { divergingColor, formatScore, inkOn } from "./scale";

export function SentimentHeatmap({
  departments,
  themes,
  cells,
}: {
  departments: string[];
  themes: string[];
  cells: HeatCell[];
}) {
  const get = (d: string, t: string) => cells.find((c) => c.department === d && c.theme === t);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-[3px] text-sm">
          <thead>
            <tr>
              <th className="w-36 text-left text-xs font-medium text-pewter" scope="col">
                <span className="sr-only">Department</span>
              </th>
              {themes.map((t) => (
                <th key={t} scope="col" className="px-1 pb-1 text-left align-bottom text-xs font-medium text-pewter">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d}>
                <th scope="row" className="pr-2 text-left text-sm font-medium whitespace-nowrap text-ink">
                  {d}
                </th>
                {themes.map((t) => {
                  const c = get(d, t);
                  if (!c || c.count === 0 || c.avgSentiment == null)
                    return (
                      <td key={t} className="h-11 rounded-md bg-mist/60 text-center text-xs text-pewter" title={`${d} · ${t}: no feedback`}>
                        ·
                      </td>
                    );
                  const s = c.avgSentiment;
                  return (
                    <td key={t} className="h-11 rounded-md p-0 text-center" style={{ background: divergingColor(s), color: inkOn(s) }}>
                      <Link
                        href={`/dashboard/feedback?department=${encodeURIComponent(d)}&theme=${encodeURIComponent(t)}`}
                        title={`${d} · ${t}: ${c.count} items, avg sentiment ${formatScore(s)}`}
                        className="flex h-11 flex-col items-center justify-center leading-tight hover:opacity-85"
                      >
                        <span className="font-medium tabular-nums">{formatScore(s)}</span>
                        <span className="text-[11px] opacity-80">n={c.count}</span>
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-pewter" aria-label="Color scale">
        <span>Negative</span>
        <span
          className="h-2 w-40 rounded-full"
          style={{ background: `linear-gradient(90deg, ${divergingColor(-1)}, ${divergingColor(0)}, ${divergingColor(1)})` }}
        />
        <span>Positive</span>
        <span className="ml-2">Cell = avg sentiment (−1…+1), n = items</span>
      </div>
    </div>
  );
}
