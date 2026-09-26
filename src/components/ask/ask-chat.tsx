"use client";

import { ArrowUp, CornerDownRight, Loader2, MessageSquareText, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { SentimentBadge, UrgencyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { DEPARTMENTS, type Sentiment, type Urgency } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type Source = {
  key: string;
  id: string;
  summary: string | null;
  department: string | null;
  sentiment: string | null;
  urgency: string | null;
  created_at: string;
  similarity: number | null;
};

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sources: Source[]; follow_ups: string[] };

const SUGGESTIONS = [
  "What's driving negative sentiment in Engineering?",
  "Any harassment or safety concerns this month?",
  "What do people appreciate most?",
  "Top 3 actions to reduce attrition risk?",
];

/** Turns [F3] citations into links that open the source feedback. */
function withCitationLinks(markdown: string, sources: Source[]) {
  const byKey = new Map(sources.map((s) => [s.key, s.id]));
  return markdown.replace(/\[(F\d+)\]/g, (m, key: string) => {
    const id = byKey.get(key);
    return id ? `[${key}](cite:${id})` : m;
  });
}

function markdownComponents(): Components {
  return {
    a: ({ href, children }) => {
      if (href?.startsWith("cite:")) {
        return (
          <Link
            href={`/dashboard/feedback?id=${href.slice(5)}`}
            className="mx-0.5 inline-flex items-center rounded-full bg-mist px-1.5 py-px align-baseline font-mono text-[11px] font-medium text-cobalt no-underline hover:bg-edge"
          >
            {children}
          </Link>
        );
      }
      return (
        <a href={href} className="text-cobalt underline" target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    },
    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold text-obsidian">{children}</strong>,
    h1: ({ children }) => <h4 className="mb-2 font-semibold text-obsidian">{children}</h4>,
    h2: ({ children }) => <h4 className="mb-2 font-semibold text-obsidian">{children}</h4>,
    h3: ({ children }) => <h4 className="mb-2 font-semibold text-obsidian">{children}</h4>,
    table: ({ children }) => (
      <div className="mb-3 overflow-x-auto rounded-smallcards border border-mist">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b border-mist bg-mist/50 px-3 py-2 text-left font-medium">{children}</th>,
    td: ({ children }) => <td className="border-b border-mist px-3 py-2 tabular-nums">{children}</td>,
  };
}

export function AskChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const components = markdownComponents();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, department: department || null, history }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: json.answer, sources: json.sources ?? [], follow_ups: json.follow_ups ?? [] },
      ]);
    } catch (err) {
      toast.error((err as Error).message);
      setMessages((prev) => prev.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-4xl flex-col">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Ask your feedback</p>
          <h1 className="text-heading-md font-semibold text-obsidian">
            Ask anything, get <span className="brush">cited</span> answers
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Limit to department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-10 w-auto min-w-44 text-sm"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
          {!empty && (
            <Button variant="subtle" size="sm" onClick={() => setMessages([])} aria-label="New conversation">
              <RotateCcw className="size-4" /> New
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {empty && (
          <Card className="grid-paper p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-smallcards bg-carbon text-paper">
                <MessageSquareText className="size-5" />
              </div>
              <div>
                <h2 className="text-heading-sm font-semibold text-ink">Your feedback, searchable in plain English</h2>
                <p className="mt-1 max-w-xl text-pewter">
                  Pulse finds the most relevant feedback by meaning, not keywords, then answers with citations you can
                  open. Employee identities are never revealed.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="group flex cursor-pointer items-center justify-between gap-3 rounded-smallcards bg-paper p-4 text-left text-sm font-medium text-ink shadow-field transition-colors hover:bg-white"
                >
                  {s}
                  <ArrowUp className="size-4 rotate-45 text-pewter transition-colors group-hover:text-cobalt" />
                </button>
              ))}
            </div>
          </Card>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-cards rounded-br-md bg-carbon px-5 py-3 text-paper">{m.content}</div>
            </div>
          ) : (
            <Fragment key={i}>
              <div className="flex gap-3">
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-lime text-obsidian shadow-bead">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <Card className="text-[15px] leading-relaxed text-carbon">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} urlTransform={(u) => u}>
                      {withCitationLinks(m.content, m.sources)}
                    </ReactMarkdown>
                  </Card>

                  {m.sources.length > 0 && (
                    <div className="mt-3">
                      <p className="eyebrow mb-2">Sources · {m.sources.length}</p>
                      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                        {m.sources.map((s) => (
                          <Link
                            key={s.key}
                            href={`/dashboard/feedback?id=${s.id}`}
                            className="w-64 shrink-0 snap-start rounded-smallcards bg-paper p-3 shadow-field transition-colors hover:bg-white"
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <span className="font-mono text-[11px] font-medium text-cobalt">{s.key}</span>
                              <span className="text-xs text-pewter">
                                {s.department ?? "Unspecified"} · {formatDate(s.created_at)}
                              </span>
                            </div>
                            <p className="line-clamp-3 text-sm text-ink">{s.summary}</p>
                            <div className="mt-2 flex gap-1.5">
                              <SentimentBadge sentiment={(s.sentiment as Sentiment) ?? null} />
                              <UrgencyBadge urgency={(s.urgency as Urgency) ?? null} />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {i === messages.length - 1 && m.follow_ups.length > 0 && !loading && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.follow_ups.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => ask(f)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-mist bg-paper px-3 py-1.5 text-sm text-ink hover:bg-mist"
                        >
                          <CornerDownRight className="size-3.5 text-pewter" />
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          ),
        )}

        {loading && (
          <div className="flex items-center gap-3 text-sm text-pewter">
            <div className="flex size-8 items-center justify-center rounded-full bg-mist">
              <Loader2 className="size-4 animate-spin text-ink" />
            </div>
            Searching feedback and drafting an answer…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-4 mt-8"
      >
        <div className="flex items-end gap-2 rounded-cards bg-paper p-2 shadow-card">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            placeholder={department ? `Ask about ${department}…` : "Ask about your employees' feedback…"}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-4 py-2.5 text-ink placeholder:text-pewter/70 focus:outline-none"
            aria-label="Your question"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send"
            className={cn(
              "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-lime text-obsidian shadow-bead transition-opacity",
              (!input.trim() || loading) && "cursor-not-allowed opacity-40",
            )}
          >
            <ArrowUp className="size-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
