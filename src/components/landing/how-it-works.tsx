"use client";

import { AlertOctagon, ArrowRight, AudioLines, Check, ClipboardList, FileText, ScanText } from "lucide-react";
import { useState } from "react";
import { PillTabs } from "@/components/ui/pill-tabs";

type Step = "collect" | "analyze" | "act";

const STEPS: Record<Step, { title: string; body: string; points: string[] }> = {
  collect: {
    title: "Meet employees where they are",
    body: "A single link works on any phone. People type, record a voice note, or photograph a handwritten note, in any language. Anonymous is the default. Sharing a name is opt-in.",
    points: ["No login required for employees", "Voice transcribed in-memory, never stored", "Private tracking code for every submission"],
  },
  analyze: {
    title: "AI turns raw words into structured signal",
    body: "Gemini translates, redacts personal details, and classifies each entry: sentiment, emotions, themes from a fixed HR taxonomy, urgency, and risk flags. Embeddings power semantic search.",
    points: ["PII replaced with [NAME], [EMAIL]…", "Calibrated urgency from low to critical", "Harassment and safety always escalated"],
  },
  act: {
    title: "HR gets priorities, not a spreadsheet",
    body: "The dashboard shows what is changing and where. One click produces an executive summary with prioritized action items. Respond to employees and track each case to closure.",
    points: ["Critical alerts by email", "AI action plan with owners and timeframes", "Reply is shown on the employee’s tracking page"],
  },
};

function CollectMock() {
  return (
    <div className="space-y-2.5">
      {[
        { Icon: FileText, label: "Text", meta: "“The new rota app keeps crashing on shift swap…”" },
        { Icon: AudioLines, label: "Voice · Kannada", meta: "0:38 · transcribing…" },
        { Icon: ScanText, label: "Photo of note", meta: "3 handwritten slips detected" },
      ].map(({ Icon, label, meta }) => (
        <div key={label} className="flex items-center gap-3 rounded-smallcards border border-mist bg-white p-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-images bg-mist">
            <Icon className="size-4 text-ink" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{label}</p>
            <p className="truncate text-xs text-pewter">{meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyzeMock() {
  return (
    <div className="rounded-smallcards border border-mist bg-white p-4 font-mono text-[12px] leading-6 text-ink">
      <p className="text-pewter">{"{"}</p>
      <p className="pl-4">
        <span className="text-pewter">&quot;summary&quot;:</span> &quot;Weekend deploys causing team exhaustion&quot;,
      </p>
      <p className="pl-4">
        <span className="text-pewter">&quot;sentiment&quot;:</span> &quot;negative&quot;, <span className="text-pewter">&quot;score&quot;:</span> -0.72,
      </p>
      <p className="pl-4">
        <span className="text-pewter">&quot;themes&quot;:</span> [&quot;Workload &amp; Burnout&quot;],
      </p>
      <p className="pl-4">
        <span className="text-pewter">&quot;urgency&quot;:</span> &quot;high&quot;, <span className="text-pewter">&quot;risk_flags&quot;:</span> [&quot;burnout&quot;]
      </p>
      <p className="text-pewter">{"}"}</p>
    </div>
  );
}

function ActMock() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-3 rounded-smallcards border border-mist bg-white p-3">
        <AlertOctagon className="mt-0.5 size-4 shrink-0 text-[var(--status-critical)]" aria-hidden />
        <p className="text-sm text-ink">
          <span className="font-semibold">Critical alert emailed</span>
          <span className="block text-xs text-pewter">Safety · Operations · 2 min after submission</span>
        </p>
      </div>
      <div className="rounded-smallcards border border-mist bg-white p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ClipboardList className="size-4" aria-hidden /> Action plan
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-graphite">
          <li><span className="mr-1.5 rounded-full bg-carbon px-1.5 py-px font-mono text-[10px] text-paper">P1</span>Freeze weekend deploys without 5-day notice</li>
          <li><span className="mr-1.5 rounded-full border border-edge px-1.5 py-px font-mono text-[10px] text-ink">P2</span>Publish promotion criteria for Support L2</li>
        </ul>
      </div>
      <div className="flex items-center gap-2 rounded-smallcards border border-mist bg-white p-3 text-sm text-ink">
        <Check className="size-4 text-[var(--status-good)]" aria-hidden /> Employee sees “Action taken” on PLS-7K4M-Q2XD
      </div>
    </div>
  );
}

export function HowItWorks() {
  const [step, setStep] = useState<Step>("collect");
  const s = STEPS[step];
  return (
    <section id="how" className="scroll-mt-20 border-y border-mist bg-white/60 py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-[36px] leading-[1.02] font-semibold tracking-[-1px] text-obsidian sm:text-heading">
            Collect. Analyze. <span className="brush">Act.</span>
          </h2>
          <div className="mt-8 flex justify-center">
            <PillTabs
              value={step}
              onChange={setStep}
              tabs={[
                { value: "collect", label: "1 · Collect" },
                { value: "analyze", label: "2 · Analyze" },
                { value: "act", label: "3 · Act" },
              ]}
            />
          </div>
        </div>

        <div className="mt-12 grid items-center gap-10 rounded-cards bg-paper p-6 shadow-card sm:p-10 lg:grid-cols-2">
          <div role="tabpanel" aria-live="polite">
            <h3 className="text-[26px] leading-tight font-semibold tracking-[-0.5px] text-obsidian">{s.title}</h3>
            <p className="mt-4 text-[16px] leading-relaxed text-graphite">{s.body}</p>
            <ul className="mt-6 space-y-2.5">
              {s.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[15px] text-ink">
                  <ArrowRight className="mt-1 size-4 shrink-0 text-cobalt" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-cards bg-mist/60 p-4 sm:p-6">
            {step === "collect" && <CollectMock />}
            {step === "analyze" && <AnalyzeMock />}
            {step === "act" && <ActMock />}
          </div>
        </div>
      </div>
    </section>
  );
}
