"use client";

import { Languages, Loader2, Lock, Mail, RefreshCw, Send, ShieldAlert, User, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, SentimentBadge, UrgencyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { formatScore } from "@/components/dashboard/charts/scale";
import { RISK_LABELS, STATUS_LABELS, STATUSES, type FeedbackRow, type FeedbackStatus, type RiskFlag } from "@/lib/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";

type Note = { id: string; created_at: string; author_name: string | null; body: string };

const CHANNEL_LABEL = { text: "Written", voice: "Voice note", ocr: "Scanned document" } as const;

export function FeedbackDetail({ feedback, notes: initialNotes, closeHref }: { feedback: FeedbackRow; notes: Note[]; closeHref: string }) {
  const [f, setF] = useState(feedback);
  const [notes, setNotes] = useState(initialNotes);
  const [response, setResponse] = useState(feedback.hr_response ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "status" | "response" | "note" | "reprocess">(null);

  async function patch(body: Record<string, unknown>, kind: "status" | "response") {
    setBusy(kind);
    const before = f;
    // Optimistic: flip the status pill immediately, roll back if the server rejects it.
    if (kind === "status") setF((cur) => ({ ...cur, status: body.status as FeedbackStatus }));
    try {
      const res = await fetch(`/api/feedback/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setF(json.feedback);
      if (kind === "response")
        toast.success(json.emailed ? "Response saved and emailed to the employee" : "Response saved — visible on their tracking page");
      else toast.success("Status updated");
    } catch (e) {
      if (kind === "status") setF(before);
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy("note");
    try {
      const res = await fetch(`/api/feedback/${f.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add note");
      setNotes((n) => [...n, json.note]);
      setNote("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reprocess() {
    setBusy("reprocess");
    try {
      const res = await fetch(`/api/feedback/${f.id}/reprocess`, { method: "POST" });
      const json = await res.json();
      if (json.feedback) setF(json.feedback);
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      toast.success("AI analysis complete");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const risks = (f.risk_flags ?? []) as RiskFlag[];

  return (
    <Card className="relative max-h-none p-0 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-mist bg-paper/95 px-6 py-4 backdrop-blur">
        <div className="min-w-0">
          <p className="eyebrow">Feedback · {f.tracking_code}</p>
          <p className="text-sm text-pewter">
            {formatDate(f.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} ·{" "}
            {CHANNEL_LABEL[f.channel as keyof typeof CHANNEL_LABEL] ?? f.channel}
          </p>
        </div>
        <Link
          href={closeHref}
          scroll={false}
          aria-label="Close"
          className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-mist"
        >
          <X className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="space-y-6 px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <UrgencyBadge urgency={f.urgency} />
          <SentimentBadge sentiment={f.sentiment} />
          {f.sentiment_score != null && <Badge className="tabular-nums">score {formatScore(f.sentiment_score)}</Badge>}
          <Badge>{f.department ?? "No department"}</Badge>
          {f.category && <Badge>{f.category}</Badge>}
        </div>

        {f.processing_status !== "done" && (
          <div className="flex flex-wrap items-center gap-3 rounded-smallcards border border-mist bg-white p-4 text-sm">
            <span className="text-ink">
              {f.processing_status === "failed" ? "AI analysis failed" : "AI analysis is pending"}
              {f.processing_error && <span className="block text-xs text-pewter">{f.processing_error}</span>}
            </span>
            <Button size="sm" variant="dark" className="ml-auto" onClick={reprocess} disabled={busy !== null}>
              {busy === "reprocess" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
              Re-run AI analysis
            </Button>
          </div>
        )}

        {f.summary && (
          <div>
            <p className="eyebrow">AI summary</p>
            <p className="text-subheading font-medium text-obsidian">{f.summary}</p>
          </div>
        )}

        <div>
          <p className="eyebrow flex items-center gap-2">
            Feedback {f.is_anonymous ? "(redacted)" : ""}
            {f.language && f.language !== "English" && (
              <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                <Languages className="size-3.5" aria-hidden /> translated from {f.language}
              </span>
            )}
          </p>
          <blockquote className="rounded-smallcards border-l-[3px] border-edge bg-white px-4 py-3 leading-relaxed whitespace-pre-wrap text-ink">
            {f.redacted_text ?? (f.is_anonymous ? "Awaiting analysis" : f.raw_text)}
          </blockquote>
          {!f.is_anonymous && f.raw_text && f.raw_text !== f.redacted_text && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-pewter hover:text-ink">Original wording</summary>
              <p className="mt-2 rounded-smallcards bg-white px-4 py-3 whitespace-pre-wrap text-ink">{f.raw_text}</p>
            </details>
          )}
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="eyebrow">Themes</dt>
            <dd className="flex flex-wrap gap-1.5">
              {(f.themes ?? []).length ? (f.themes ?? []).map((t) => <Badge key={t}>{t}</Badge>) : <span className="text-pewter">—</span>}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Emotions</dt>
            <dd className="flex flex-wrap gap-1.5">
              {(f.emotions ?? []).length ? (
                (f.emotions ?? []).map((e) => (
                  <Badge key={e} className="capitalize">
                    {e}
                  </Badge>
                ))
              ) : (
                <span className="text-pewter">—</span>
              )}
            </dd>
          </div>
          {risks.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="eyebrow">Risk flags</dt>
              <dd className="flex flex-wrap gap-1.5">
                {risks.map((r) => (
                  <Badge key={r}>
                    <ShieldAlert className="size-3.5" style={{ color: "var(--status-critical)" }} aria-hidden />
                    {RISK_LABELS[r] ?? r}
                  </Badge>
                ))}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="eyebrow">Submitted by</dt>
            <dd className="flex items-center gap-2 text-ink">
              {f.is_anonymous ? (
                <>
                  <Lock className="size-4 text-pewter" aria-hidden /> Anonymous
                </>
              ) : (
                <>
                  <User className="size-4 text-pewter" aria-hidden />
                  {f.submitter_name ?? "Named employee"}
                  {f.submitter_email && (
                    <a href={`mailto:${f.submitter_email}`} className="inline-flex items-center gap-1 text-sm text-cobalt hover:underline">
                      <Mail className="size-3.5" aria-hidden />
                      {f.submitter_email}
                    </a>
                  )}
                </>
              )}
            </dd>
          </div>
        </dl>

        {f.suggested_action && (
          <div className="rounded-smallcards bg-mint-tint/60 p-4">
            <p className="eyebrow text-forest">Suggested next step</p>
            <p className="text-ink">{f.suggested_action}</p>
          </div>
        )}

        <div>
          <p className="eyebrow mb-2">Status</p>
          <div role="radiogroup" aria-label="Status" className="inline-flex flex-wrap gap-1 rounded-full border border-mist p-1">
            {STATUSES.map((s: FeedbackStatus) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={f.status === s}
                disabled={busy !== null}
                onClick={() => f.status !== s && patch({ status: s }, "status")}
                className={cn(
                  "h-8 cursor-pointer rounded-navlinks px-3 text-sm font-medium transition-colors",
                  f.status === s ? "bg-carbon text-paper" : "text-ink hover:bg-mist",
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="hr-response" className="eyebrow mb-2 block">
            Response to employee — “You said, we did”
          </label>
          <Textarea
            id="hr-response"
            className="min-h-28"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Thank them and share what will change. Visible on their tracking page."
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-xs text-pewter">
              {f.responded_at ? `Last sent ${timeAgo(f.responded_at)}. ` : ""}
              {f.submitter_email ? "They'll also get it by email." : "Shown when they check their tracking code."}
            </p>
            <Button
              size="sm"
              className="ml-auto"
              disabled={busy !== null || !response.trim() || response.trim() === (f.hr_response ?? "")}
              onClick={() => patch({ hr_response: response }, "response")}
            >
              {busy === "response" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              Send response
            </Button>
          </div>
        </div>

        <div className="border-t border-mist pt-5">
          <p className="eyebrow flex items-center gap-1.5">
            <Lock className="size-3.5" aria-hidden /> Internal notes · HR only
          </p>
          {notes.length === 0 ? (
            <p className="mb-3 text-sm text-pewter">No notes yet. Notes are never shown to the employee.</p>
          ) : (
            <ol className="mb-3 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-smallcards bg-white px-4 py-3 text-sm shadow-[rgba(29,33,48,0.06)_0_0_0_1px]">
                  <p className="text-xs text-pewter">
                    <span className="font-medium text-ink">{n.author_name ?? "HR"}</span> · {timeAgo(n.created_at)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-ink">{n.body}</p>
                </li>
              ))}
            </ol>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              aria-label="Add internal note"
              className="min-h-12 py-2.5"
              rows={1}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
              }}
              placeholder="Add a note for the HR team…"
            />
            <Button size="md" variant="dark" onClick={addNote} disabled={busy !== null || !note.trim()}>
              {busy === "note" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Add"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
