"use client";

import dynamic from "next/dynamic";
import type { WeeklySentiment } from "@/lib/dashboard-data";

/** Recharts (~110 kB) loads after first paint; the skeleton matches the chart's legend + 256px plot. */
const SentimentTrendChart = dynamic(() => import("./sentiment-trend").then((m) => m.SentimentTrendChart), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" aria-label="Loading chart">
      <div className="mb-3 flex gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-5 w-24 animate-pulse rounded bg-mist" />
        ))}
      </div>
      <div className="flex h-64 items-end gap-3 px-6">
        {[40, 55, 35, 70, 50, 62, 45, 80, 58, 66, 48, 72].map((h, i) => (
          <div key={i} className="flex-1 animate-pulse rounded-t bg-mist" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  ),
});

export function SentimentTrendLazy({ data }: { data: WeeklySentiment[] }) {
  return <SentimentTrendChart data={data} />;
}
