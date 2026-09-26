import Link from "next/link";
import { cn } from "@/lib/utils";

export type BarItem = {
  label: string;
  value: number;
  href?: string;
  color?: string;
  icon?: React.ReactNode;
  hint?: string;
};

/** Horizontal single-hue bars with direct value labels (sorted by caller). */
export function BarList({ items, max, className }: { items: BarItem[]; max?: number; className?: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((it) => {
        const pct = Math.max(2, (it.value / top) * 100);
        const inner = (
          <>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                {it.icon}
                <span className="truncate">{it.label}</span>
              </span>
              <span className="shrink-0 text-pewter tabular-nums">
                {it.hint && <span className="mr-2 text-xs">{it.hint}</span>}
                <span className="font-medium text-ink">{it.value}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-mist">
              <div
                className="h-2 rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: it.color ?? "var(--viz-bar)" }}
              />
            </div>
          </>
        );
        return (
          <li key={it.label} title={`${it.label}: ${it.value}${it.hint ? ` · ${it.hint}` : ""}`}>
            {it.href ? (
              <Link href={it.href} className="block rounded-md outline-offset-4 hover:opacity-85">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
