import { listFeedback, readFilters } from "@/lib/dashboard-data";
import { getHrUser } from "@/lib/supabase/server";

const COLUMNS = [
  ["created_at", "Created"],
  ["tracking_code", "Tracking code"],
  ["department", "Department"],
  ["category", "Category"],
  ["channel", "Channel"],
  ["language", "Language"],
  ["sentiment", "Sentiment"],
  ["sentiment_score", "Sentiment score"],
  ["urgency", "Urgency"],
  ["themes", "Themes"],
  ["risk_flags", "Risk flags"],
  ["emotions", "Emotions"],
  ["summary", "Summary"],
  ["redacted_text", "Feedback (redacted, English)"],
  ["suggested_action", "Suggested action"],
  ["status", "Status"],
  ["hr_response", "HR response"],
  ["is_anonymous", "Anonymous"],
] as const;

function cell(v: unknown) {
  const s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const user = await getHrUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const rows = await listFeedback(readFilters(sp), 5000);
  const lines = [
    COLUMNS.map(([, h]) => cell(h)).join(","),
    ...rows.map((r) => COLUMNS.map(([k]) => cell((r as unknown as Record<string, unknown>)[k])).join(",")),
  ];
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pulse-feedback-${date}.csv"`,
    },
  });
}
