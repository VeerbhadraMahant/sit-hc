import { ArrowRight, Globe2, Lock, PenLine } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Screenshot } from "@/components/landing/screenshot";

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
            Vocalyze collects employee feedback by text, voice note or a photo of a handwritten slip — then uses AI to
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

        <div className="relative pb-20 sm:pb-16 lg:pb-6">
          <div className="lg:rotate-[0.8deg]">
            <Screenshot
              src="/screenshots/dashboard.png"
              alt="Vocalyze HR dashboard showing feedback volume, sentiment trend, top themes and a critical alert queue"
              aspect="16/10"
              priority
            />
          </div>
          <div className="absolute -bottom-4 left-2 w-[46%] max-w-[240px] -rotate-[5deg] sm:-bottom-10 sm:left-6 lg:-left-10 lg:w-[42%]">
            <Screenshot
              src="/screenshots/submit-voice.png"
              alt="Employee recording a voice note on the Vocalyze feedback form"
              aspect="4/3"
              objectPosition="50% 38%"
              sizes="240px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
