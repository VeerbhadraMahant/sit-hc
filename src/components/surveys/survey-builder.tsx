"use client";

import {
  ArrowDown,
  ArrowUp,
  CircleDot,
  Gauge,
  LayoutTemplate,
  ListChecks,
  Plus,
  Send,
  SlidersHorizontal,
  TextCursorInput,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/field";
import { newQuestionId, SURVEY_TEMPLATES, SurveyInputSchema } from "@/lib/surveys";
import type { SurveyQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

type QType = SurveyQuestion["type"];

export const QUESTION_TYPE_META: Record<QType, { label: string; hint: string; Icon: typeof Gauge }> = {
  scale: { label: "Scale 1–5", hint: "Agreement or rating", Icon: SlidersHorizontal },
  enps: { label: "eNPS 0–10", hint: "Likelihood to recommend", Icon: Gauge },
  choice: { label: "Single choice", hint: "Pick one option", Icon: ListChecks },
  text: { label: "Open text", hint: "Free-form answer", Icon: TextCursorInput },
};

function blankQuestion(type: QType): SurveyQuestion {
  const id = newQuestionId();
  switch (type) {
    case "scale":
      return { id, type, prompt: "", min_label: "Strongly disagree", max_label: "Strongly agree" };
    case "enps":
      return { id, type, prompt: "How likely are you to recommend this company as a place to work?" };
    case "choice":
      return { id, type, prompt: "", options: ["Option 1", "Option 2"] };
    case "text":
      return { id, type, prompt: "", optional: true };
  }
}

export type BuilderInitial = {
  id?: string;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  closes_at?: string | null;
};

export function SurveyBuilder({ initial }: { initial?: BuilderInitial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initial?.questions ?? []);
  const [closesAt, setClosesAt] = useState(initial?.closes_at ? initial.closes_at.slice(0, 10) : "");
  const [busy, setBusy] = useState<null | "draft" | "publish">(null);
  const isNew = !initial?.id;

  function update(i: number, patch: Partial<SurveyQuestion>) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? ({ ...q, ...patch } as SurveyQuestion) : q)));
  }
  function move(i: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const next = [...qs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return qs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function applyTemplate(key: string) {
    const t = SURVEY_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    if ((title || questions.length) && !window.confirm("Replace the current survey with this template?")) return;
    setTitle(t.title);
    setDescription(t.description);
    setQuestions(t.questions.map((q) => ({ ...q, id: newQuestionId() })));
  }

  async function save(publish: boolean) {
    const payload = {
      title,
      description: description || null,
      questions,
      closes_at: closesAt ? new Date(`${closesAt}T23:59:59`).toISOString() : null,
    };
    const check = SurveyInputSchema.safeParse(payload);
    if (!check.success) {
      toast.error(check.error.issues[0]?.message ?? "Please check the survey.");
      return;
    }
    setBusy(publish ? "publish" : "draft");
    try {
      let id = initial?.id;
      if (isNew) {
        const res = await fetch(`/api/surveys${publish ? "?publish=1" : ""}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        id = json.survey.id;
      } else {
        const res = await fetch(`/api/surveys/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (publish) {
          const pub = await fetch(`/api/surveys/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "publish" }),
          });
          const pj = await pub.json();
          if (!pub.ok) throw new Error(pj.error);
        }
      }
      toast.success(publish ? "Survey published — employees have been notified." : "Draft saved.");
      router.push(`/dashboard/surveys/${id}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't save the survey.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <Card>
          <div className="space-y-4">
            <div>
              <Label htmlFor="s-title">Survey title</Label>
              <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quarterly eNPS" maxLength={140} />
            </div>
            <div>
              <Label htmlFor="s-desc">Intro for employees</Label>
              <Textarea
                id="s-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-20"
                placeholder="Why you're asking and how long it takes."
                maxLength={600}
              />
            </div>
          </div>
        </Card>

        {questions.length === 0 && (
          <Card className="border border-dashed border-edge bg-transparent text-center shadow-none">
            <p className="text-sm text-pewter">No questions yet. Start from a template or add a question below.</p>
          </Card>
        )}

        {questions.map((q, i) => {
          const meta = QUESTION_TYPE_META[q.type];
          return (
            <Card key={q.id} small className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-pewter tabular-nums">Q{i + 1}</span>
                <Badge>
                  <meta.Icon className="size-3.5" aria-hidden />
                  {meta.label}
                </Badge>
                <div className="ml-auto flex items-center gap-1">
                  <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="size-4" />
                  </IconBtn>
                  <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === questions.length - 1}>
                    <ArrowDown className="size-4" />
                  </IconBtn>
                  <IconBtn label="Delete question" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
              </div>
              <Input
                aria-label={`Question ${i + 1} prompt`}
                value={q.prompt}
                onChange={(e) => update(i, { prompt: e.target.value })}
                placeholder="Write the question…"
                maxLength={300}
              />
              {q.type === "scale" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    aria-label="Label for 1"
                    value={q.min_label ?? ""}
                    onChange={(e) => update(i, { min_label: e.target.value })}
                    placeholder="1 = …"
                    className="h-10 text-sm"
                    maxLength={40}
                  />
                  <Input
                    aria-label="Label for 5"
                    value={q.max_label ?? ""}
                    onChange={(e) => update(i, { max_label: e.target.value })}
                    placeholder="5 = …"
                    className="h-10 text-sm"
                    maxLength={40}
                  />
                </div>
              )}
              {q.type === "enps" && (
                <p className="text-xs text-pewter">0–10 scale. eNPS = % promoters (9–10) − % detractors (0–6).</p>
              )}
              {q.type === "choice" && (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <CircleDot className="size-4 shrink-0 text-pewter" aria-hidden />
                      <Input
                        aria-label={`Option ${oi + 1}`}
                        value={opt}
                        onChange={(e) => update(i, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })}
                        className="h-10 text-sm"
                        maxLength={80}
                      />
                      <IconBtn
                        label="Remove option"
                        disabled={q.options.length <= 2}
                        onClick={() => update(i, { options: q.options.filter((_, k) => k !== oi) })}
                      >
                        <X className="size-4" />
                      </IconBtn>
                    </div>
                  ))}
                  {q.options.length < 8 && (
                    <button
                      type="button"
                      onClick={() => update(i, { options: [...q.options, `Option ${q.options.length + 1}`] })}
                      className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-cobalt hover:underline"
                    >
                      <Plus className="size-4" aria-hidden /> Add option
                    </button>
                  )}
                </div>
              )}
              {q.type === "text" && (
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={!!q.optional}
                    onChange={(e) => update(i, { optional: e.target.checked })}
                    className="size-4 accent-[var(--color-carbon)]"
                  />
                  Optional
                </label>
              )}
            </Card>
          );
        })}

        <div className="flex flex-wrap gap-2">
          {(Object.keys(QUESTION_TYPE_META) as QType[]).map((t) => {
            const { label, Icon } = QUESTION_TYPE_META[t];
            return (
              <Button
                key={t}
                type="button"
                variant="subtle"
                size="sm"
                disabled={questions.length >= 15}
                onClick={() => setQuestions((qs) => [...qs, blankQuestion(t)])}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </Button>
            );
          })}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {isNew && (
          <Card small>
            <p className="eyebrow mb-2 flex items-center gap-2">
              <LayoutTemplate className="size-3.5" aria-hidden /> Templates
            </p>
            <div className="grid gap-2">
              {SURVEY_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(t.key)}
                  className="cursor-pointer rounded-smallcards border border-mist px-3 py-2.5 text-left transition-colors hover:border-edge hover:bg-mist/50"
                >
                  <span className="block text-sm font-medium text-ink">{t.title}</span>
                  <span className="block text-xs text-pewter">{t.questions.length} questions</span>
                </button>
              ))}
            </div>
          </Card>
        )}
        <Card small className="space-y-3">
          <div>
            <Label htmlFor="s-close">Closes on (optional)</Label>
            <Input id="s-close" type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="h-10 text-sm" />
          </div>
          <p className="text-xs text-pewter">
            Responses are anonymous. Each employee can answer once; results by department only appear for groups of 5 or more.
          </p>
          <div className="grid gap-2">
            <Button type="button" onClick={() => save(true)} disabled={!!busy}>
              <Send className="size-4" aria-hidden />
              {busy === "publish" ? "Publishing…" : "Publish & notify"}
            </Button>
            <Button type="button" variant="subtle" onClick={() => save(false)} disabled={!!busy}>
              {busy === "draft" ? "Saving…" : "Save draft"}
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  );
}

function IconBtn({
  label,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-mist disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
