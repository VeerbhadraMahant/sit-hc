import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-cobalt-signal)" />
      <path
        d="M6 17h4.5l2.5-6 4 11 3-8 1.5 3H26"
        fill="none"
        stroke="#fcfcfd"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-obsidian", className)}
    >
      <LogoMark />
      Pulse
    </Link>
  );
}
