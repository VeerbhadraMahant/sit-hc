"use client";

import { cn } from "@/lib/utils";

export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-mist bg-paper p-1 shadow-[rgba(29,33,48,0.08)_0_0_0_1px]",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "inline-flex h-9 cursor-pointer items-center gap-2 rounded-navlinks px-4 text-sm font-medium whitespace-nowrap transition-colors",
            value === t.value ? "bg-carbon text-paper" : "text-ink hover:bg-mist",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
