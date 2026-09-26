"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#hr", label: "For HR" },
  { href: "#employees", label: "For employees" },
  { href: "#privacy", label: "Privacy" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-mist/80 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-navlinks px-3 py-2 text-[15px] font-medium text-ink transition-colors hover:text-cobalt"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <ButtonLink href="/login?as=employee" variant="ghost" size="sm">
            Employee login
          </ButtonLink>
          <ButtonLink href="/login?as=hr" variant="ghost" size="sm">
            HR login
          </ButtonLink>
          <ButtonLink href="/submit" size="sm">
            Share feedback
          </ButtonLink>
        </div>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-ink shadow-field sm:ml-2 lg:hidden"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-mist bg-paper px-4 pt-2 pb-5 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-mist py-3 text-base font-medium text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 sm:hidden">
            <ButtonLink href="/submit">Share feedback</ButtonLink>
            <ButtonLink href="/login?as=employee" variant="subtle">
              Employee login
            </ButtonLink>
            <ButtonLink href="/login?as=hr" variant="subtle">
              HR login
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
