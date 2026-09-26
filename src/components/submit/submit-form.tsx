"use client";

import { ArrowRight, Check, Copy, EyeOff, Loader2, Lock, Mic, PenLine, ScanLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/pill-tabs";
import { CATEGORIES, DEPARTMENTS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ScanUpload } from "./scan-upload";
import { VoiceRecorder } from "./voice-recorder";

type Mode = "text" | "voice" | "ocr";
type Result = { trackingCode: string; summary: string | null; themes: string[]; processing_status: string };

const MIN = 10;
const MAX = 5000;

export function SubmitForm() {
  const [mode, setMode] = useState<Mode>("text");
  const [texts, setTexts] = useState<Record<Mode, string>>({ text: "", voice: "", ocr: "" });
  const [languages, setLanguages] = useState<Record<Mode, string | null>>({ text: null, voice: null, ocr: null });
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const text = texts[mode];
  const setText = (m: Mode) => (t: string) => setTexts((s) => ({ ...s, [m]: t }));
  const setLanguage = (m: Mode) => (l: string | null) => setLanguages((s) => ({ ...s, [m]: l }));
  const tooShort = text.trim().length < MIN;

  function matchDepartment(d: string | null) {
    if (!d) return;
    const hit = DEPARTMENTS.find((x) => x.toLowerCase() === d.trim().toLowerCase());
    if (hit && !department) setDepartment(hit);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (tooShort) {
      setError(
        mode === "text"
          ? `Please write at least ${MIN} characters.`
          : mode === "voice"
            ? "Record a voice note first."
            : "Upload a note first.",
      );
      return;
    }
    if (!anonymous && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email, or leave it blank.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          channel: mode,
          department: department || null,
          category: category || null,
          isAnonymous: anonymous,
          name: anonymous ? null : name || null,
          email: anonymous ? null : email || null,
          language: languages[mode],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return <SuccessScreen result={result} identified={!anonymous && !!email} />;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card glow="lime" arc>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2 className="text-heading-sm font-semibold text-ink">What&apos;s on your mind?</h2>
          </div>
          <PillTabs<Mode>
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError("");
            }}
            tabs={[
              { value: "text", label: <><PenLine className="size-4" aria-hidden /> Write</> },
              { value: "voice", label: <><Mic className="size-4" aria-hidden /> Voice note</> },
              { value: "ocr", label: <><ScanLine className="size-4" aria-hidden /> Scan a note</> },
            ]}
          />
        </div>

        {mode === "text" && (
          <div>
            <Label htmlFor="feedback" className="sr-only">
              Your feedback
            </Label>
            <Textarea
              id="feedback"
              value={texts.text}
              onChange={(e) => setText("text")(e.target.value)}
              maxLength={MAX}
              placeholder="Share what's working, what isn't, or an idea. Specific examples help the most. Any language is fine."
              aria-describedby="char-count"
            />
            <p id="char-count" className={cn("mt-2 text-right text-xs tabular-nums", texts.text.length > MAX * 0.9 ? "text-serious" : "text-pewter")}>
              {texts.text.length.toLocaleString()} / {MAX.toLocaleString()}
            </p>
          </div>
        )}
        {mode === "voice" && (
          <VoiceRecorder transcript={texts.voice} onTranscript={setText("voice")} onLanguage={setLanguage("voice")} />
        )}
        {mode === "ocr" && (
          <ScanUpload
            text={texts.ocr}
            onText={setText("ocr")}
            onLanguage={setLanguage("ocr")}
            onDepartment={matchDepartment}
          />
        )}
      </Card>

      <Card>
        <p className="eyebrow">Step 2</p>
        <h2 className="mb-5 text-heading-sm font-semibold text-ink">A little context (optional)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="department">Department</Label>
            <Select id="department" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Prefer not to say</option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Type of feedback</Label>
            <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Let AI decide</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <p className="eyebrow">Step 3</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-heading-sm font-semibold text-ink">Stay anonymous?</h2>
            <p className="mt-1 text-sm text-pewter">Recommended. You&apos;ll still get a private tracking code.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={anonymous}
            aria-label="Submit anonymously"
            onClick={() => setAnonymous((a) => !a)}
            className={cn(
              "relative mt-1 inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt",
              anonymous ? "bg-carbon" : "bg-edge",
            )}
          >
            <span
              className={cn(
                "inline-block size-6 rounded-full bg-paper shadow transition-transform",
                anonymous ? "translate-x-7" : "translate-x-1",
              )}
            />
          </button>
        </div>

        {anonymous ? (
          <ul className="mt-5 grid gap-3 text-sm text-ink sm:grid-cols-3">
            <li className="flex gap-2 rounded-smallcards bg-mist/60 p-3">
              <EyeOff className="size-4 shrink-0 text-ink" aria-hidden />
              No name, email or account is stored.
            </li>
            <li className="flex gap-2 rounded-smallcards bg-mist/60 p-3">
              <ShieldCheck className="size-4 shrink-0 text-ink" aria-hidden />
              AI removes names, emails & IDs before HR reads it.
            </li>
            <li className="flex gap-2 rounded-smallcards bg-mist/60 p-3">
              <Lock className="size-4 shrink-0 text-ink" aria-hidden />
              Your original wording is deleted after analysis.
            </li>
          </ul>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
            </div>
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={200}
                placeholder="We'll email your tracking code"
              />
            </div>
            <p className="text-sm text-pewter sm:col-span-2">
              HR will see who you are and can follow up with you directly.
            </p>
          </div>
        )}
      </Card>

      {error && (
        <p role="alert" className="rounded-smallcards border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-pewter">
          By submitting you agree that HR may use this feedback, in aggregate, to improve the workplace.
        </p>
        <Button type="submit" size="lg" disabled={submitting || tooShort} className="shrink-0">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Analysing securely…
            </>
          ) : (
            <>
              Send feedback <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function SuccessScreen({ result, identified }: { result: Result; identified: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-6">
      <Card glow="mint" arc className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-lime text-obsidian shadow-bead">
          <Check className="size-7" aria-hidden />
        </span>
        <p className="eyebrow mt-5">Feedback received</p>
        <h2 className="mt-1 text-heading-md font-semibold text-obsidian">Thank you for speaking up</h2>
        <p className="mt-6 text-sm font-medium text-ink">Your private tracking code</p>
        <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <code className="rounded-smallcards bg-mist px-5 py-3 font-mono text-2xl font-medium tracking-[3px] text-obsidian sm:text-3xl">
            {result.trackingCode}
          </code>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result.trackingCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                /* ignore */
              }
            }}
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mx-auto mt-3 max-w-md text-sm text-pewter">
          Save this code — it&apos;s the only way to check on your feedback
          {identified ? ". We've also emailed it to you." : ", and we can't recover it for anonymous submissions."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href={`/track/${result.trackingCode}`}>
            Track status <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <Button type="button" variant="subtle" onClick={() => window.location.reload()}>
            Send another
          </Button>
        </div>
      </Card>

      {result.summary && (
        <Card>
          <p className="eyebrow">What we heard</p>
          <p className="mt-2 text-lg leading-relaxed text-ink">{result.summary}</p>
          {result.themes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.themes.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <p className="eyebrow">What happens next</p>
        <ol className="mt-3 grid gap-4 sm:grid-cols-3">
          {[
            ["Grouped", "Your feedback joins similar feedback so patterns — not individuals — stand out."],
            ["Reviewed", "The People team reviews themes weekly and escalates anything urgent right away."],
            ["Answered", "When action is taken, you'll see HR's response on your tracking page."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-carbon text-sm font-medium text-paper">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-ink">{t}</p>
                <p className="text-sm text-pewter">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-pewter">
          Need urgent help? Contact your HR business partner directly, or see the{" "}
          <Link href="/track" className="text-cobalt hover:underline">
            tracking page
          </Link>{" "}
          any time.
        </p>
      </Card>
    </div>
  );
}
