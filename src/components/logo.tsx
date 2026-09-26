import Link from "next/link";
import { cn } from "@/lib/utils";

/** Voice-wave mark: a cobalt tile with five rounded waveform bars. */
export function LogoMark({ className }: { className?: string }) {
  const bars = [
    { x: 7, h: 8 },
    { x: 11.5, h: 14 },
    { x: 16, h: 20 },
    { x: 20.5, h: 12 },
    { x: 25, h: 6 },
  ];
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-cobalt-signal)" />
      {bars.map(({ x, h }) => (
        <rect key={x} x={x - 1.4} y={16 - h / 2} width="2.8" height={h} rx="1.4" fill="#fcfcfd" />
      ))}
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
      Vocalyze
    </Link>
  );
}
