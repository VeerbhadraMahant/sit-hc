"use client";

import { CircleCheck, Lock, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import type { SurveyAnswers, SurveyQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

function isAnswered(q: SurveyQuestion, v: SurveyAnswers[string] | undefined) {
  if (q.type === "text") return typeof v === "string" && v.trim().length > 0;
  return v !== undefined && v !== "";
}

export function SurveyForm({ surveyId, questions }: { surveyId: string; questions: SurveyQuestion[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const required = questions.filter((q) => !(q.type === "text" && q.optional));
  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const requiredLeft = required.filter((q) => !isAnswered(q, answers[q.id])).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  const set = (id: string, v: number | string) => setAnswers((a) => ({ ...a, [id]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (requiredLeft) {
      const first = required.find((q) => !isAnswered(q, answers[q.id]));
      document.getElementById(`q-${first?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error(`Please answer ${requiredLeft} more required question${requiredLeft === 1 ? "" : "s"}.`);
      return;
    }
    setSubmitting(true);
    try {
      const clean = Object.fromEntries(Object.entries(answers).filter(([, v]) => !(typeof v === "string" && !v.trim())));
      const res = await fetch(`/api/surveys/${surveyId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: clean }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 409) throw new Error(json.error);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card glow="mint" arc className="flex flex-col items-center gap-3 py-12 text-center">
        <CircleCheck className="size-10 text-forest" aria-hidden />
        <h2 className="text-heading-sm font-semibold text-ink">Thank you — your answers are in</h2>
        <p className="max-w-md text-sm text-pewter">
          Your response was stored anonymously. HR sees combined results, and anything they change because of it will show up on the Updates board.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href="/portal/updates" className={buttonClass("subtle", "sm")}>
            See what changed
          </Link>
          <Link href="/portal" className={buttonClass("dark", "sm")}>
            Back to home
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="sticky top-16 z-10 -mx-4 bg-paper/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-full sm:px-5">
        <div className="flex items-center justify-between text-xs text-pewter">
          <span>
            {answeredCount} of {questions.length} answered
          </span>
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" aria-hidden /> Anonymous
          </span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-mist" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-1.5 rounded-full bg-carbon transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {questions.map((q, i) => (
        <Card key={q.id} id={`q-${q.id}`} small className="scroll-mt-32 space-y-4 p-5">
          <fieldset>
            <legend className="text-base font-medium text-ink">
              <span className="mr-2 font-mono text-xs text-pewter">Q{i + 1}</span>
              {q.prompt}
              {q.type === "text" && q.optional && <span className="ml-2 text-xs font-normal text-pewter">(optional)</span>}
            </legend>
            <div className="mt-4">
              {q.type === "scale" && (
                <ScalePicker
                  name={q.id}
                  values={[1, 2, 3, 4, 5]}
                  value={answers[q.id] as number | undefined}
                  onChange={(v) => set(q.id, v)}
                  minLabel={q.min_label}
                  maxLabel={q.max_label}
                />
              )}
              {q.type === "enps" && (
                <ScalePicker
                  name={q.id}
                  values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                  value={answers[q.id] as number | undefined}
                  onChange={(v) => set(q.id, v)}
                  minLabel="Not at all likely"
                  maxLabel="Extremely likely"
                  compact
                />
              )}
              {q.type === "choice" && (
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {q.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={answers[q.id] === o}
                      onClick={() => set(q.id, o)}
                      className={cn(
                        "h-10 cursor-pointer rounded-navlinks border px-4 text-sm font-medium transition-colors",
                        answers[q.id] === o ? "border-carbon bg-carbon text-paper" : "border-edge text-ink hover:bg-mist",
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              {q.type === "text" && (
                <Textarea
                  aria-label={q.prompt}
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                  className="min-h-28"
                  maxLength={2000}
                  placeholder="Please don't include names — your answer is anonymous."
                />
              )}
            </div>
          </fieldset>
        </Card>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-xs text-pewter">You can answer each survey once. Your name is never stored with your answers.</p>
        <Button type="submit" size="lg" disabled={submitting}>
          <Send className="size-4" aria-hidden />
          {submitting ? "Submitting…" : "Submit answers"}
        </Button>
      </div>
    </form>
  );
}

function ScalePicker({
  name,
  values,
  value,
  onChange,
  minLabel,
  maxLabel,
  compact,
}: {
  name: string;
  values: number[];
  value: number | undefined;
  onChange: (v: number) => void;
  minLabel?: string;
  maxLabel?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div role="radiogroup" aria-label={name} className={cn("grid gap-1.5", compact ? "grid-cols-11" : "grid-cols-5")}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-smallcards border font-medium tabular-nums transition-colors",
              compact ? "h-10 text-sm" : "h-12 text-base",
              value === v ? "border-carbon bg-carbon text-paper" : "border-edge text-ink hover:bg-mist",
            )}
          >
            {v}
          </button>
        ))}
      </div>
      {(minLabel || maxLabel) && (
        <div className="mt-1.5 flex justify-between text-xs text-pewter">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
