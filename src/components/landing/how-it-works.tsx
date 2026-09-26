"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Screenshot } from "@/components/landing/screenshot";
import { PillTabs } from "@/components/ui/pill-tabs";

type Step = "collect" | "analyze" | "act";

const STEPS: Record<Step, { title: string; body: string; points: string[]; shot: string; alt: string }> = {
  collect: {
    title: "Meet employees where they are",
    body: "A single link works on any phone. People type, record a voice note, or photograph a handwritten note, in any language. Anonymous is the default. Sharing a name is opt-in.",
    points: ["No login required for employees", "Voice transcribed in-memory, never stored", "Private tracking code for every submission"],
    shot: "/screenshots/submit.png",
    alt: "The Vocalyze feedback form with write, voice note and scan-a-note options",
  },
  analyze: {
    title: "AI turns raw words into structured signal",
    body: "Gemini translates, redacts personal details, and classifies each entry: sentiment, emotions, themes from a fixed HR taxonomy, urgency, and risk flags. Embeddings power semantic search.",
    points: ["PII replaced with [NAME], [EMAIL]…", "Calibrated urgency from low to critical", "Harassment and safety always escalated"],
    shot: "/screenshots/feedback-detail.png",
    alt: "A feedback item opened in the HR inbox showing themes, sentiment, urgency and a suggested action",
  },
  act: {
    title: "HR gets priorities, not a spreadsheet",
    body: "The dashboard shows what is changing and where. One click produces an executive summary with prioritized action items. Respond to employees and track each case to closure.",
    points: ["Critical alerts by email", "AI action plan with owners and timeframes", "Reply is shown on the employee’s tracking page"],
    shot: "/screenshots/insights.png",
    alt: "An AI-generated insight report with an executive summary and prioritized action items",
  },
};

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
            <Screenshot key={step} src={s.shot} alt={s.alt} aspect="16/10" />
          </div>
        </div>
      </div>
    </section>
  );
}
