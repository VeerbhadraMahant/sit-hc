import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="grid-paper grid-paper-fade pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-[860px] px-4 text-center sm:px-6">
        <p className="eyebrow">Two minutes. Any language.</p>
        <h2 className="mt-3 text-[40px] leading-[0.98] font-semibold tracking-[-1.5px] text-obsidian sm:text-[56px] sm:tracking-[-2.4px]">
          Something on your mind? <span className="brush">Say it</span>.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/submit" size="lg">
            Share feedback <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/track" size="lg" variant="subtle">
            Track my feedback
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-mist">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-pewter">AI employee feedback & insights.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink">
          <Link href="/submit" className="hover:text-cobalt">Share feedback</Link>
          <Link href="/track" className="hover:text-cobalt">Track feedback</Link>
          <Link href="/login" className="hover:text-cobalt">HR login</Link>
          <Link href="#privacy" className="hover:text-cobalt">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
