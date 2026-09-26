import {
  AudioLines,
  EyeOff,
  Layers,
  MessageSquareText,
  Radar,
  RefreshCcw,
  ScanText,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { Card, type Glow } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FEATURES: { title: string; body: string; Icon: LucideIcon; glow?: Glow }[] = [
  {
    title: "Voice notes",
    body: "Employees record in their own words and language. Gemini transcribes and translates, and the audio is never stored.",
    Icon: AudioLines,
  },
  {
    title: "Handwritten & scanned notes",
    body: "Snap a suggestion-box slip, paper survey or whiteboard. OCR reads handwriting and splits a page into separate entries.",
    Icon: ScanText,
  },
  {
    title: "Anonymous by design",
    body: "Names, emails, phone numbers and IDs are redacted before HR ever sees a word. Raw anonymous text is deleted after analysis.",
    Icon: EyeOff,
    glow: "lime",
  },
  {
    title: "Theme & sentiment AI",
    body: "Every entry is mapped to a fixed HR taxonomy with sentiment, emotions and a one-line summary, so trends are comparable week to week.",
    Icon: Tags,
  },
  {
    title: "Risk radar",
    body: "Harassment, safety, burnout and attrition signals are flagged as critical and emailed to HR within seconds.",
    Icon: Radar,
  },
  {
    title: "Ask your feedback",
    body: "“What’s driving attrition in Sales?” Semantic search over every response, with answers that cite the feedback behind them.",
    Icon: MessageSquareText,
  },
  {
    title: "Closed loop",
    body: "Each submission gets a private tracking code. Employees see when HR reviews it and read the response. You said, we did.",
    Icon: RefreshCcw,
  },
];

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-20 py-20 lg:py-28">
      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="max-w-[560px]">
          <p className="eyebrow">Features</p>
          <h2 className="mt-3 text-[36px] leading-[1.02] font-semibold tracking-[-1px] text-obsidian sm:text-heading">
            One inbox for every way people speak up
          </h2>
        </div>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {FEATURES.map(({ title, body, Icon, glow }, i) => (
            <li key={title} className={cn(i === 6 && "sm:col-span-2 lg:col-span-1")}>
              <Card glow={glow} arc={!!glow} className="h-full">
                <span className="inline-flex size-11 items-center justify-center rounded-images border border-mist bg-white">
                  <Icon className="size-5 text-ink" aria-hidden />
                </span>
                <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-graphite">{body}</p>
              </Card>
            </li>
          ))}
          <li className="hidden lg:block">
            <Card className="h-full">
              <span className="inline-flex size-11 items-center justify-center rounded-images border border-mist bg-white">
                <Layers className="size-5 text-ink" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold text-ink">Built on</h3>
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
