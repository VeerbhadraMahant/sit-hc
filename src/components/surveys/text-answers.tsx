"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, sentimentColor } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Sentiment } from "@/lib/types";

type Summary = {
  overall_sentiment: Sentiment;
  headline: string;
  themes: { name: string; mentions: number; quote: string }[];
  takeaways: string[];
  actions: { title: string; priority: "P1" | "P2" | "P3"; owner: string }[];
};

/** Open-text answers with an on-demand AI summary. */
export function TextAnswers({ surveyId, questionId, answers }: { surveyId: string; questionId: string; answers: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const shown = expanded ? answers : answers.slice(0, 5);

  async function summarize() {
    setLoading(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSummary(json.summary);
    } catch (err) {
      toast.error((err as Error).message || "Summary failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!answers.length) return <p className="text-sm text-pewter">No written answers yet.</p>;

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="space-y-3 rounded-smallcards border border-mist bg-mist/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="size-4 text-cobalt" aria-hidden />
            <p className="font-medium text-ink">{summary.headline}</p>
            <Badge className="capitalize">
              <span className="size-2 rounded-full" style={{ background: sentimentColor[summary.overall_sentiment] }} aria-hidden />
              {summary.overall_sentiment}
            </Badge>
          </div>
          {summary.themes.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {summary.themes.map((t) => (
                <li key={t.name} className="rounded-smallcards bg-paper p-3 shadow-card">
                  <p className="flex items-center justify-between gap-2 text-sm font-medium text-ink">
                    {t.name}
                    <span className="text-xs text-pewter tabular-nums">{t.mentions} mentions</span>
                  </p>
                  <p className="mt-1 text-xs text-pewter italic">“{t.quote}”</p>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="eyebrow">Key takeaways</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
                {summary.takeaways.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            {summary.actions.length > 0 && (
              <div>
                <p className="eyebrow">Suggested actions</p>
                <ul className="mt-1 space-y-1.5 text-sm text-ink">
                  {summary.actions.map((a) => (
                    <li key={a.title} className="flex gap-2">
                      <span className="mt-0.5 shrink-0 rounded-full bg-carbon px-1.5 font-mono text-[10px] leading-4 text-paper">{a.priority}</span>
                      <span>
                        {a.title} <span className="text-pewter">· {a.owner}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        answers.length >= 3 && (
          <Button variant="subtle" size="sm" onClick={summarize} disabled={loading}>
            <Sparkles className="size-4" aria-hidden />
            {loading ? `Reading ${answers.length} answers…` : "Summarize with AI"}
          </Button>
        )
      )}
      <ul className="space-y-2">
        {shown.map((a, i) => (
          <li key={i} className="rounded-smallcards border border-mist px-3 py-2 text-sm leading-relaxed text-ink">
            {a}
          </li>
        ))}
      </ul>
      {answers.length > 5 && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="cursor-pointer text-sm font-medium text-cobalt hover:underline">
          {expanded ? "Show fewer" : `Show all ${answers.length} answers`}
        </button>
      )}
    </div>
  );
}
