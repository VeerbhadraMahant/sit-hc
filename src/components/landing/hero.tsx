import { AlertOctagon, ArrowRight, AudioLines, Globe2, Lock, PenLine } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const WEEKS = [
  { pos: 42, neu: 30, neg: 28 },
  { pos: 45, neu: 29, neg: 26 },
  { pos: 40, neu: 28, neg: 32 },
  { pos: 38, neu: 27, neg: 35 },
  { pos: 44, neu: 30, neg: 26 },
  { pos: 51, neu: 27, neg: 22 },
  { pos: 55, neu: 26, neg: 19 },
  { pos: 58, neu: 25, neg: 17 },
];

const THEMES = [
  { name: "Workload & Burnout", n: 48 },
  { name: "Career Growth", n: 36 },
  { name: "Management", n: 29 },
  { name: "Tools & Resources", n: 21 },
];

function DashboardMock() {
  return (
    <div
      className="relative rounded-images bg-white p-4 shadow-screenshot ring-1 ring-mist sm:p-5"
      role="img"
      aria-label="Preview of the Pulse HR dashboard showing KPIs, weekly sentiment, top themes and a critical alert"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-mist" />
        <span className="size-2.5 rounded-full bg-mist" />
        <span className="size-2.5 rounded-full bg-mist" />
        <span className="ml-3 font-mono text-[10px] tracking-[1.5px] text-pewter uppercase">HR Console · Overview</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { k: "Responses", v: "1,284", d: "+18%" },
          { k: "Sentiment", v: "+0.34", d: "+0.12" },
          { k: "Critical", v: "3", d: "open" },
        ].map((t) => (
          <div key={t.k} className="rounded-smallcards border border-mist p-2.5 sm:p-3">
            <p className="font-mono text-[9px] tracking-[1.2px] text-pewter uppercase sm:text-[10px]">{t.k}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-obsidian sm:text-xl">{t.v}</p>
            <p className="text-[11px] text-pewter">{t.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        <div className="rounded-smallcards border border-mist p-3 sm:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-ink">Weekly sentiment</p>
            <div className="flex gap-2 text-[10px] text-pewter">
              <span className="inline-flex items-center gap-1">
                <i className="size-1.5 rounded-full bg-[var(--viz-positive)]" /> Pos
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="size-1.5 rounded-full bg-[var(--viz-negative)]" /> Neg
              </span>
            </div>
          </div>
          <div className="mt-3 flex h-24 items-end gap-1.5">
            {WEEKS.map((w, i) => (
              <div key={i} className="flex h-full flex-1 flex-col justify-end gap-[2px]">
                <div className="rounded-t-[3px] bg-[var(--viz-positive)]" style={{ height: `${w.pos}%` }} />
                <div className="bg-[var(--viz-neutral)]" style={{ height: `${w.neu * 0.6}%` }} />
                <div className="rounded-b-[3px] bg-[var(--viz-negative)]" style={{ height: `${w.neg * 0.8}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-smallcards border border-mist p-3 sm:col-span-2">
          <p className="text-xs font-medium text-ink">Top themes</p>
          <ul className="mt-2 space-y-2">
            {THEMES.map((t) => (
              <li key={t.name}>
                <div className="flex justify-between text-[11px] text-ink">
                  <span className="truncate">{t.name}</span>
                  <span className="text-pewter tabular-nums">{t.n}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-mist">
                  <div className="h-full rounded-full bg-cobalt" style={{ width: `${(t.n / 48) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-smallcards border border-mist bg-paper p-3">
        <AlertOctagon className="mt-0.5 size-4 shrink-0 text-[var(--status-critical)]" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink">
            Critical · Operations <span className="font-normal text-pewter">· 12m ago</span>
          </p>
          <p className="mt-0.5 text-xs text-graphite">
            Night-shift staff report unsafe loading-bay conditions; request immediate review.
          </p>
        </div>
      </div>
    </div>
  );
}

function VoiceMock() {
  const bars = [6, 12, 18, 10, 22, 28, 16, 24, 12, 20, 30, 14, 8, 18, 26, 12, 6, 16, 22, 10];
  return (
    <div
      className="w-[260px] rounded-cards bg-paper p-4 shadow-card glow-cyan arc sm:w-[290px]"
      role="img"
      aria-label="A voice note being transcribed and translated from Hindi"
    >
      <div className="flex items-center gap-2">
        <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-carbon text-paper">
          <span className="animate-pulse-ring absolute inset-0 rounded-full bg-cyan/50" />
          <AudioLines className="relative size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">Voice note · 0:42</p>
          <p className="font-mono text-[10px] tracking-[1.2px] text-pewter uppercase">Hindi → English</p>
        </div>
      </div>
      <div className="mt-3 flex h-8 items-center gap-[3px]" aria-hidden>
        {bars.map((h, i) => (
          <span key={i} className="w-[3px] flex-1 rounded-full bg-ink/70" style={{ height: `${h + 2}px` }} />
        ))}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-graphite">
        “We keep getting last-minute weekend deploys. The team is exhausted and nobody asks before scheduling…”
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-mist px-2 py-0.5 text-[11px] font-medium text-ink">Workload & Burnout</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-mist px-2 py-0.5 text-[11px] font-medium text-ink">
          <i className="size-1.5 rounded-full bg-[var(--viz-negative)]" /> negative
        </span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-paper grid-paper-fade pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-24 lg:pb-28">
        <div>
          <p className="eyebrow">AI-powered employee listening</p>
          <h1 className="mt-4 text-[44px] leading-[0.95] font-semibold tracking-[-1.8px] text-obsidian sm:text-display-sm lg:text-[72px] lg:tracking-[-3.2px]">
            Every <span className="brush">voice</span> heard.
            <br />
            Every theme <span className="brush">acted</span> on.
          </h1>
          <p className="mt-7 max-w-[520px] text-subheading text-graphite">
            Pulse collects employee feedback by text, voice note or a photo of a handwritten slip — then uses AI to
            surface themes, sentiment and risks, and hands HR a prioritized list of what to fix next.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/submit" size="lg">
              Share feedback <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/dashboard" size="lg" variant="subtle">
              Open HR dashboard
            </ButtonLink>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-pewter">
            <li className="inline-flex items-center gap-1.5">
              <Lock className="size-4 text-ink" aria-hidden /> Anonymous by default
            </li>
            <li className="inline-flex items-center gap-1.5">
              <PenLine className="size-4 text-ink" aria-hidden /> Voice, text & handwritten notes
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Globe2 className="size-4 text-ink" aria-hidden /> 40+ languages
            </li>
          </ul>
        </div>

        <div className="relative pb-16 sm:pb-10 lg:pb-0">
          <div className="lg:rotate-[1.2deg]">
            <DashboardMock />
          </div>
          <div className="absolute -bottom-2 left-2 -rotate-[4deg] sm:-bottom-6 sm:-left-8 lg:-left-14">
            <VoiceMock />
          </div>
        </div>
      </div>
    </section>
  );
}
