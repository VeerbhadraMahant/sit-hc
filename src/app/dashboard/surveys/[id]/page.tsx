import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSurveyForHr } from "@/components/surveys/data";
import { SurveyActions } from "@/components/surveys/survey-actions";
import { SurveyBuilder } from "@/components/surveys/survey-builder";
import { SurveyResults } from "@/components/surveys/survey-results";
import { SurveyStatusBadge } from "@/components/surveys/survey-status";
import { requireHr } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Survey — Vocalyze HR" };

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [, { id }] = await Promise.all([requireHr(), params]);
  const data = await getSurveyForHr(id);
  if (!data) notFound();
  const { survey, responses, employeeCount } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/surveys" className="inline-flex items-center gap-1 text-sm text-pewter hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Surveys
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">{survey.status === "draft" ? "Draft survey" : "Survey results"}</p>
              <SurveyStatusBadge status={survey.status} />
            </div>
            <h1 className="text-heading-md font-semibold text-obsidian">{survey.title}</h1>
            <p className="mt-1 text-sm text-pewter">
              {survey.status === "draft"
                ? `Created ${formatDate(survey.created_at)} · not visible to employees yet`
                : `Published ${formatDate(survey.published_at ?? survey.created_at, { day: "numeric", month: "short", year: "numeric" })}${
                    survey.closes_at ? ` · ${survey.status === "closed" ? "closed" : "closes"} ${formatDate(survey.closes_at)}` : ""
                  }`}
            </p>
          </div>
          <SurveyActions id={survey.id} status={survey.status} responses={responses.length} />
        </div>
      </div>

      {survey.status === "draft" ? (
        <SurveyBuilder
          initial={{ id: survey.id, title: survey.title, description: survey.description, questions: survey.questions, closes_at: survey.closes_at }}
        />
      ) : (
        <SurveyResults survey={survey} responses={responses} employeeCount={employeeCount} />
      )}
    </div>
  );
}
