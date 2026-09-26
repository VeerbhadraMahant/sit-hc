import { Sparkles } from "lucide-react";
import { Screenshot } from "@/components/landing/screenshot";
import { Card } from "@/components/ui/card";

const DEPTS = ["Engineering", "Sales", "Support", "Operations", "Design"];
const COLS = ["Workload", "Growth", "Mgmt", "Pay", "Culture"];
// Average sentiment per cell, -1..1
const GRID = [
  [-0.7, -0.2, 0.1, 0.0, 0.4],
  [-0.1, -0.6, -0.3, -0.5, 0.2],
  [-0.4, -0.3, 0.3, -0.2, 0.5],
  [-0.2, 0.1, -0.1, -0.3, -0.6],
  [0.2, 0.3, 0.5, 0.1, 0.6],
];

/** Diverging blue <-> red with a gray midpoint (see docs/DESIGN.md -> Data viz). */
function cellColor(v: number) {
  const a = Math.min(1, Math.abs(v) / 0.8);
  const pole = v >= 0 ? "42, 120, 214" : "227, 73, 72";
  return Math.abs(v) < 0.08 ? "#e3e6ee" : `rgba(${pole}, ${0.15 + a * 0.75})`;
}

export function ForHr() {
  return (
    <section id="hr" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="eyebrow">For HR teams</p>
            <h2 className="mt-3 text-[36px] leading-[1.02] font-semibold tracking-[-1px] text-obsidian sm:text-heading">
              From a thousand comments to <span className="brush">four</span> decisions
            </h2>
          </div>
          <p className="max-w-[520px] text-subheading text-graphite lg:justify-self-end">
            Generate a leadership-ready brief for any team and time period. Vocalyze cites the feedback behind every
            concern, so you can defend every recommendation.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-5 lg:items-start">
          <Card className="lg:col-span-3" glow="lime">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Executive summary · Last 30 days</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-mist px-2.5 py-0.5 text-xs font-medium text-ink">
                <Sparkles className="size-3.5 text-cobalt" aria-hidden /> AI generated
              </span>
            </div>
            <h3 className="mt-3 text-heading-sm font-semibold text-ink">
              Every report reads like it was written by an analyst who never sleeps.
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-graphite">
              A real report, generated from real feedback in this demo — headline, evidence-linked concerns, bright
              spots, and a prioritized action plan with owners and timeframes.
            </p>
            <div className="mt-5">
              <Screenshot
                src="/screenshots/insights.png"
                alt="An AI-generated Vocalyze insight report showing the executive summary and top concerns"
                aspect="16/11"
              />
            </div>
          </Card>

          <Card className="lg:col-span-2 self-start" glow="cyan">
            <p className="eyebrow">Sentiment heatmap</p>
            <h3 className="text-heading-sm font-semibold text-ink">Department × theme</h3>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[300px] border-separate border-spacing-[3px] text-xs">
                <caption className="sr-only">Average sentiment by department and theme, illustrative data</caption>
                <thead>
                  <tr>
                    <th scope="col" className="sr-only">Department</th>
                    {COLS.map((c) => (
                      <th key={c} scope="col" className="pb-1 text-center font-medium text-pewter">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEPTS.map((d, r) => (
                    <tr key={d}>
                      <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap text-ink">
                        {d}
                      </th>
                      {GRID[r].map((v, c) => (
                        <td
                          key={c}
                          title={`${d} · ${COLS[c]}: ${v > 0 ? "+" : ""}${v.toFixed(1)}`}
                          className="h-9 rounded-[6px] text-center font-mono text-[10px] text-obsidian/80"
                          style={{ background: cellColor(v) }}
                        >
                          {v > 0 ? "+" : ""}
                          {v.toFixed(1)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-pewter">
              <span>Negative</span>
              <span
                className="h-2 flex-1 rounded-full"
                style={{ background: "linear-gradient(90deg, #e34948, #e3e6ee, #2a78d6)" }}
                aria-hidden
              />
              <span>Positive</span>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
