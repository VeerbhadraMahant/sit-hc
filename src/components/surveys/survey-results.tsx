import { EyeOff } from "lucide-react";
import { StatTile } from "@/components/dashboard/stat-tile";
import { BarList } from "@/components/dashboard/charts/bar-list";
import { Card, CardHeader } from "@/components/ui/card";
import { departmentGroups, enps, K_ANON_MIN, mean, questionStats } from "@/lib/surveys";
import type { Survey } from "@/lib/types";
import type { SurveyResponseRow } from "./data";
import { Distribution, EnpsSummary, enpsCellColor, enpsColor, SCALE_COLORS, scaleCellColor } from "./charts";
import { TextAnswers } from "./text-answers";

export function SurveyResults({
  survey,
  responses,
  employeeCount,
}: {
  survey: Survey;
  responses: SurveyResponseRow[];
  employeeCount: number;
}) {
  const stats = survey.questions.map((q) => ({ q, s: questionStats(q, responses) }));
  const enpsQ = stats.find((x) => x.s.type === "enps");
  const scaleAvgs = stats.flatMap((x) => (x.s.type === "scale" && x.s.avg !== null ? [x.s.avg] : []));
  const rate = employeeCount ? Math.round((responses.length / employeeCount) * 100) : null;
  const numericQs = survey.questions.filter((q) => q.type === "scale" || q.type === "enps");
  const { groups, hiddenCount } = departmentGroups(responses);

  if (!responses.length) {
    return (
      <Card className="text-center">
        <p className="text-heading-sm font-semibold text-ink">No responses yet</p>
        <p className="mt-1 text-sm text-pewter">
          {survey.status === "active" ? "Employees have been notified. Results appear here as answers arrive." : "This survey has no answers."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Responses" value={responses.length} sub={employeeCount ? `of ${employeeCount} employees` : undefined} glow="cyan" />
        <StatTile label="Response rate" value={rate === null ? "—" : `${rate}%`} sub="of registered employees" />
        {enpsQ && enpsQ.s.type === "enps" ? (
          <StatTile
            label="eNPS"
            value={enpsQ.s.enps.score === null ? "—" : enpsQ.s.enps.score > 0 ? `+${enpsQ.s.enps.score}` : enpsQ.s.enps.score}
            sub="promoters − detractors"
            glow="lime"
          />
        ) : (
          <StatTile label="Questions" value={survey.questions.length} />
        )}
        <StatTile
          label="Avg agreement"
          value={scaleAvgs.length ? `${mean(scaleAvgs)!.toFixed(1)}/5` : "—"}
          sub="across scale questions"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {stats.map(({ q, s }, i) => (
          <Card key={q.id} className={s.type === "text" ? "lg:col-span-2" : undefined}>
            <CardHeader eyebrow={`Q${i + 1} · ${s.n} answers`} title={q.prompt} />
            {s.type === "scale" && q.type === "scale" && (
              <>
                <p className="mb-3 text-sm text-pewter">
                  Average <span className="font-semibold text-ink tabular-nums">{s.avg?.toFixed(2) ?? "—"}</span> / 5
                </p>
                <Distribution
                  counts={s.counts}
                  labels={["1", "2", "3", "4", "5"]}
                  colors={SCALE_COLORS}
                  caption={[q.min_label ? `1 = ${q.min_label}` : undefined, q.max_label ? `5 = ${q.max_label}` : undefined]}
                />
              </>
            )}
            {s.type === "enps" && (
              <div className="space-y-5">
                <EnpsSummary enps={s.enps} />
                <Distribution
                  counts={s.counts}
                  labels={Array.from({ length: 11 }, (_, k) => String(k))}
                  colors={Array.from({ length: 11 }, (_, k) => enpsColor(k))}
                  caption={["Not at all likely", "Extremely likely"]}
                />
              </div>
            )}
            {s.type === "choice" && (
              <BarList
                items={[...s.counts]
                  .sort((a, b) => b.count - a.count)
                  .map((c) => ({ label: c.option, value: c.count, hint: s.n ? `${Math.round((c.count / s.n) * 100)}%` : undefined }))}
              />
            )}
            {s.type === "text" && (
              <TextAnswers surveyId={survey.id} questionId={q.id} answers={s.answers} />
            )}
          </Card>
        ))}
      </div>

      {numericQs.length > 0 && (
        <Card>
          <CardHeader
            eyebrow="By department"
            title="Where scores differ"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-pewter">
                <EyeOff className="size-3.5" aria-hidden /> Groups under {K_ANON_MIN} are hidden
              </span>
            }
          />
          {groups.length === 0 ? (
            <p className="text-sm text-pewter">Not enough responses in any department to show a breakdown without identifying people.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[520px] border-separate border-spacing-[2px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-pewter">
                    <th className="px-2 py-1.5 font-medium">Department</th>
                    <th className="px-2 py-1.5 text-right font-medium">n</th>
                    {numericQs.map((q) => (
                      <th key={q.id} className="px-2 py-1.5 text-center font-medium" title={q.prompt}>
                        Q{survey.questions.indexOf(q) + 1}
                        <span className="block font-normal">{q.type === "enps" ? "eNPS" : "avg /5"}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.department}>
                      <td className="px-2 py-2 font-medium text-ink">{g.department}</td>
                      <td className="px-2 py-2 text-right text-pewter tabular-nums">{g.responses.length}</td>
                      {numericQs.map((q) => {
                        const st = questionStats(q, g.responses);
                        if (st.type === "enps") {
                          const sc = enps(g.responses.map((r) => Number(r.answers?.[q.id])).filter((v) => Number.isFinite(v))).score;
                          return (
                            <td key={q.id} className="rounded-[6px] px-2 py-2 text-center font-medium text-ink tabular-nums" style={{ background: sc === null ? undefined : enpsCellColor(sc) }} title={`${g.department} · eNPS ${sc}`}>
                              {sc === null ? "—" : sc > 0 ? `+${sc}` : sc}
                            </td>
                          );
                        }
                        const avg = st.type === "scale" ? st.avg : null;
                        return (
                          <td key={q.id} className="rounded-[6px] px-2 py-2 text-center font-medium text-ink tabular-nums" style={{ background: avg === null ? undefined : scaleCellColor(avg) }} title={`${g.department} · ${q.prompt}: ${avg?.toFixed(2) ?? "—"}`}>
                            {avg?.toFixed(1) ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hiddenCount > 0 && (
            <p className="mt-3 text-xs text-pewter">
              {hiddenCount} response{hiddenCount === 1 ? "" : "s"} from smaller teams {hiddenCount === 1 ? "is" : "are"} included in the totals above but not broken out.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
