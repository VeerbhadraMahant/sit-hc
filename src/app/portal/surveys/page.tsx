import type { Metadata } from "next";
import { SurveyRow } from "@/components/surveys/active-surveys-list";
import { isOpen, listSurveysForEmployee } from "@/components/surveys/data";
import { AnonymityNote } from "@/components/surveys/anonymity-note";
import { requireEmployee } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Surveys — Vocalyze" };

export default async function PortalSurveysPage() {
  const user = await requireEmployee();
  const surveys = await listSurveysForEmployee(user.id);
  const todo = surveys.filter((s) => isOpen(s) && !s.answered);
  const other = surveys.filter((s) => !(isOpen(s) && !s.answered));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Pulse surveys</p>
        <h1 className="text-heading-md font-semibold text-obsidian">Quick questions from the People team</h1>
        <p className="mt-1 max-w-2xl text-pewter">A couple of minutes each. Your answers shape what changes next.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="eyebrow mb-3">To answer {todo.length > 0 && `· ${todo.length}`}</h2>
            {todo.length ? (
              <ul className="grid gap-2">
                {todo.map((s) => (
                  <li key={s.id}>
                    <SurveyRow survey={s} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-smallcards border border-dashed border-edge p-4 text-sm text-pewter">
                You&apos;re all caught up. We&apos;ll notify you when a new survey goes live.
              </p>
            )}
          </section>
          {other.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Answered & closed</h2>
              <ul className="grid gap-2">
                {other.map((s) => (
                  <li key={s.id}>
                    <SurveyRow survey={s} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <AnonymityNote />
      </div>
    </div>
  );
}

