import {
  AudioLines,
  EyeOff,
  Layers,
  MessageSquareText,
  Radar,
  RefreshCcw,
  ScanText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, type Glow } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FEATURES: { title: string; body: string; Icon: LucideIcon; glow: Glow; tilt: string }[] = [
  {
    title: "Voice notes",
    body: "Employees record in their own words and language. Gemini transcribes and translates, and the audio is never stored.",
    Icon: AudioLines,
    glow: "cyan",
    tilt: "lg:-rotate-[2deg] lg:translate-y-3",
  },
  {
    title: "Handwritten & scanned notes",
    body: "Snap a suggestion-box slip, paper survey or whiteboard. OCR reads handwriting and splits a page into separate entries.",
    Icon: ScanText,
    glow: "lime",
    tilt: "lg:rotate-[1deg]",
  },
  {
    title: "Anonymous by design",
    body: "Names, emails, phone numbers and IDs are redacted before HR ever sees a word. Raw anonymous text is deleted after analysis.",
    Icon: EyeOff,
    glow: "orchid",
    tilt: "lg:-rotate-[1deg] lg:translate-y-2",
  },
  {
    title: "Theme & sentiment AI",
    body: "Every entry is mapped to a fixed HR taxonomy with sentiment, emotions and a one-line summary, so trends are comparable week to week.",
    Icon: Sparkles,
    glow: "mint",
    tilt: "lg:rotate-[2deg] lg:translate-y-4",
  },
  {
    title: "Risk radar",
    body: "Harassment, safety, burnout and attrition signals are flagged as critical and emailed to HR within seconds.",
    Icon: Radar,
    glow: "amber",
    tilt: "lg:-rotate-[1.5deg] lg:translate-y-1",
  },
  {
    title: "Ask your feedback",
    body: "“What’s driving attrition in Sales?” Semantic search over every response, with answers that cite the feedback behind them.",
    Icon: MessageSquareText,
    glow: "citron",
    tilt: "lg:rotate-[1deg] lg:translate-y-3",
  },
  {
    title: "Closed loop",
    body: "Each submission gets a private tracking code. Employees see when HR reviews it and read the response. You said, we did.",
    Icon: RefreshCcw,
    glow: "cyan",
    tilt: "lg:-rotate-[1deg]",
  },
];

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-20 overflow-hidden py-20 lg:py-28">
      <div className="grid-paper pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="eyebrow">Features</p>
          <h2 className="mt-3 text-[36px] leading-[1.02] font-semibold tracking-[-1px] text-obsidian sm:text-heading">
            One inbox for every way people <span className="brush">speak up</span>
          </h2>
        </div>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {FEATURES.map(({ title, body, Icon, glow, tilt }, i) => (
            <li key={title} className={cn(i === 6 && "sm:col-span-2 lg:col-span-1")}>
              <Card
                glow={glow}
                arc
                className={cn("h-full transition-transform duration-300 hover:-translate-y-1 hover:rotate-0", tilt)}
              >
                <span className="inline-flex size-11 items-center justify-center rounded-images border border-mist bg-white">
                  <Icon className="size-5 text-ink" aria-hidden />
                </span>
                <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-graphite">{body}</p>
              </Card>
            </li>
          ))}
          <li className="hidden lg:block">
            <Card
              glow="mint"
              arc
              className="h-full transition-transform duration-300 hover:-translate-y-1 hover:rotate-0 lg:rotate-[1deg]"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-images border border-mist bg-white">
                <Layers className="size-5 text-ink" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-bold text-ink">Built on</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-graphite">
                Google Gemini for language, vision and embeddings · Supabase Postgres with pgvector and row-level
                security.
              </p>
            </Card>
          </li>
        </ul>
      </div>
    </section>
  );
}
