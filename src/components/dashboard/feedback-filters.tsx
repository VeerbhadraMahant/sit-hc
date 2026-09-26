"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { DEPARTMENTS, SENTIMENTS, STATUS_LABELS, STATUSES, THEMES, URGENCIES } from "@/lib/types";
import { cn } from "@/lib/utils";

const selectCls =
  "h-10 cursor-pointer rounded-full bg-paper pl-4 pr-8 text-sm text-ink shadow-field focus:outline-2 focus:outline-cobalt";

const FILTERS = [
  { key: "department", label: "All departments", options: DEPARTMENTS.map((d) => [d, d]) },
  { key: "theme", label: "All themes", options: THEMES.map((t) => [t, t]) },
  { key: "sentiment", label: "Any sentiment", options: SENTIMENTS.map((s) => [s, s[0].toUpperCase() + s.slice(1)]) },
  { key: "urgency", label: "Any urgency", options: URGENCIES.map((u) => [u, u[0].toUpperCase() + u.slice(1)]) },
  { key: "status", label: "Any status", options: STATUSES.map((s) => [s, STATUS_LABELS[s]]) },
  {
    key: "channel",
    label: "All channels",
    options: [
      ["text", "Written"],
      ["voice", "Voice"],
      ["ocr", "Scanned"],
    ],
  },
  {
    key: "days",
    label: "All time",
    options: [
      ["7", "Last 7 days"],
      ["30", "Last 30 days"],
      ["90", "Last 90 days"],
    ],
  },
] as const;

interface QuickTab {
  label: string;
  key: string;
  params: Record<string, string>;
  isCritical?: boolean;
  isWarning?: boolean;
}

const QUICK_TABS: QuickTab[] = [
  { label: "All Items", key: "all", params: {} },
  { label: "Critical Priority", key: "critical", params: { urgency: "critical" }, isCritical: true },
  { label: "High Urgency", key: "high", params: { urgency: "high" }, isWarning: true },
  { label: "Unresolved", key: "new", params: { status: "new" } },
  { label: "Workplace Safety", key: "safety", params: { theme: "Workplace Safety" } },
  { label: "Action Taken", key: "actioned", params: { status: "actioned" } },
];

export function FeedbackFiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("id");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  // Debounced search
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const t = setTimeout(() => update("q", q.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = FILTERS.some((f) => params.get(f.key)) || !!params.get("q");

  return (
    <div className="space-y-2.5">
      {/* Quick Triage Priority Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5">
        {QUICK_TABS.map((tab) => {
          const isSelected =
            tab.key === "all"
              ? !params.get("urgency") && !params.get("status") && !params.get("theme")
              : Object.entries(tab.params).every(([k, v]) => params.get(k) === v);

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                next.delete("urgency");
                next.delete("status");
                next.delete("theme");
                next.delete("page");
                next.delete("id");
                Object.entries(tab.params).forEach(([k, v]) => next.set(k, v));
                startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
              }}
              className={cn(
                "inline-flex h-8.5 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                tab.isCritical
                  ? isSelected
                    ? "bg-[#d03b3b] text-white shadow-xs font-semibold"
                    : "border border-red-200/90 bg-red-500/[0.07] text-[#d03b3b] hover:bg-red-500/15"
                  : tab.isWarning
                  ? isSelected
                    ? "bg-amber-600 text-white shadow-xs font-semibold"
                    : "border border-amber-200/90 bg-amber-500/[0.08] text-amber-900 hover:bg-amber-500/15"
                  : isSelected
                  ? "bg-carbon text-paper shadow-xs font-semibold"
                  : "border border-mist bg-paper text-ink hover:bg-mist",
              )}
            >
              {tab.isCritical && (
                <span className="relative flex size-2 shrink-0" aria-hidden>
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                      isSelected ? "bg-white" : "bg-red-400",
                    )}
                  />
                  <span className={cn("relative inline-flex size-2 rounded-full", isSelected ? "bg-white" : "bg-[#d03b3b]")} />
                </span>
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")}>
      <label className="relative min-w-56 flex-1 sm:max-w-xs">
        <span className="sr-only">Search feedback</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-pewter" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search summaries, text, codes…"
          className="h-10 w-full rounded-full bg-paper pr-4 pl-10 text-sm text-ink shadow-field placeholder:text-pewter/70 focus:outline-2 focus:outline-cobalt"
        />
      </label>
      {FILTERS.map((f) => (
        <select
          key={f.key}
          aria-label={f.label}
          value={params.get(f.key) ?? ""}
          onChange={(e) => update(f.key, e.target.value)}
          className={cn(selectCls, params.get(f.key) && "bg-carbon text-paper shadow-none")}
        >
          <option value="">{f.label}</option>
          {f.options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ))}
      {active && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full px-3 text-sm font-medium text-cobalt hover:bg-mist"
        >
          <X className="size-4" aria-hidden /> Clear
        </button>
      )}
      </div>
    </div>
  );
}
