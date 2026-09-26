import { ArrowLeft, CircleCheck, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnonymityNote } from "@/components/surveys/anonymity-note";
import { getSurveyForEmployee, isOpen } from "@/components/surveys/data";
import { SurveyForm } from "@/components/surveys/survey-form";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireEmployee } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Survey — Vocalyze" };

export default async function PortalSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireEmployee(), params]);
  const survey = await getSurveyForEmployee(user.id, id);
  if (!survey) notFound();
  const open = isOpen(survey);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/surveys" className="inline-flex items-center gap-1 text-sm text-pewter hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Surveys
        </Link>
        <p className="eyebrow mt-3">Pulse survey · {survey.questions.length} questions</p>
        <h1 className="text-heading-md font-semibold text-obsidian">{survey.title}</h1>
        {survey.description && <p className="mt-2 max-w-2xl text-pewter">{survey.description}</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {survey.answered ? (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <CircleCheck className="size-10 text-forest" aria-hidden />
              <h2 className="text-heading-sm font-semibold text-ink">You&apos;ve already answered this survey</h2>
              <p className="max-w-md text-sm text-pewter">Thanks for taking part. Watch the Updates board for what changes as a result.</p>
              <Link href="/portal/updates" className={buttonClass("subtle", "sm")}>
                See updates
              </Link>
            </Card>
          ) : !open ? (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <Lock className="size-8 text-pewter" aria-hidden />
              <h2 className="text-heading-sm font-semibold text-ink">This survey is closed</h2>
              <p className="max-w-md text-sm text-pewter">It&apos;s no longer accepting answers.</p>
            </Card>
          ) : (
            <SurveyForm surveyId={survey.id} questions={survey.questions} />
          )}
        </div>
        <AnonymityNote />
      </div>
    </div>
  );
}
