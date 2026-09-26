import { ChevronRight, ClipboardList, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { listSurveysForHr } from "@/components/surveys/data";
import { SurveyStatusBadge } from "@/components/surveys/survey-status";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireHr } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Surveys — Vocalyze HR" };

export default async function SurveysPage() {
  await requireHr();
  const surveys = await listSurveysForHr();
  const live = surveys.filter((s) => s.status === "active");
  const rest = surveys.filter((s) => s.status !== "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pulse surveys</p>
          <h1 className="text-heading-md font-semibold text-obsidian sm:text-heading">Ask the whole company, in two minutes</h1>
          <p className="mt-1 max-w-2xl text-pewter">
            Short, anonymous surveys with eNPS, scales and open questions. Each employee answers once; results by team only show for groups of 5+.
          </p>
        </div>
        <ButtonLink href="/dashboard/surveys/new">
          <Plus className="size-4" aria-hidden /> New survey
        </ButtonLink>
      </div>

      {surveys.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <ClipboardList className="size-8 text-pewter" aria-hidden />
          <p className="text-heading-sm font-semibold text-ink">No surveys yet</p>
          <p className="max-w-md text-sm text-pewter">Start from a template such as Quarterly eNPS or Burnout check — it takes a minute.</p>
          <ButtonLink href="/dashboard/surveys/new" size="sm">
            Create your first survey
          </ButtonLink>
        </Card>
      ) : (
        <>
          {live.length > 0 && <SurveySection title="Live now" surveys={live} />}
          {rest.length > 0 && <SurveySection title="Drafts & closed" surveys={rest} />}
        </>
      )}
    </div>
  );
}

function SurveySection({ title, surveys }: { title: string; surveys: Awaited<ReturnType<typeof listSurveysForHr>> }) {
  return (
    <section>
      <h2 className="eyebrow mb-3">{title}</h2>
      <div className="grid gap-3">
        {surveys.map((s) => (
          <Link key={s.id} href={`/dashboard/surveys/${s.id}`} className="group block">
            <Card small className="flex flex-wrap items-center gap-x-6 gap-y-2 transition-shadow group-hover:shadow-screenshot">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-ink">{s.title}</p>
                  <SurveyStatusBadge status={s.status} />
                </div>
                <p className="mt-0.5 text-sm text-pewter">
                  {s.questions.length} questions ·{" "}
                  {s.status === "draft"
                    ? `created ${formatDate(s.created_at)}`
                    : `published ${formatDate(s.published_at ?? s.created_at)}${s.closes_at ? ` · ${s.status === "closed" ? "closed" : "closes"} ${formatDate(s.closes_at)}` : ""}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-heading-sm leading-none font-semibold text-obsidian tabular-nums">{s.responses}</p>
                <p className="text-xs text-pewter">responses</p>
              </div>
              <ChevronRight className="size-5 text-pewter transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
