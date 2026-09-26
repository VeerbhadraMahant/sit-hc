import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { InsightReport } from "@/lib/types";

// Helvetica is one of the 14 standard PDF fonts — always available, no font
// registration/bundling needed, and renders identically on every platform.
const SEVERITY_COLOR: Record<string, string> = {
  critical: "#d03b3b",
  high: "#ec835a",
  medium: "#fab219",
  low: "#0ca30c",
};

const PRIORITY_COLOR: Record<string, string> = { P1: "#d03b3b", P2: "#fab219", P3: "#0ca30c" };

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#151720", padding: 40, lineHeight: 1.4 },
  eyebrow: { fontSize: 8, letterSpacing: 1.5, color: "#6b6d72", textTransform: "uppercase", marginBottom: 4 },
  headline: { fontSize: 20, fontWeight: 700, color: "#0a0d16", marginBottom: 8 },
  meta: { fontSize: 9, color: "#6b6d72", marginBottom: 16 },
  summary: { fontSize: 11, color: "#1d2130", marginBottom: 20, lineHeight: 1.5 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#0a0d16", marginBottom: 10, marginTop: 8 },
  card: { borderWidth: 1, borderColor: "#ebeef7", borderRadius: 4, padding: 10, marginBottom: 8 },
  cardTitle: { fontSize: 11, fontWeight: 700, marginBottom: 3 },
  cardBody: { fontSize: 9.5, color: "#474950", marginBottom: 4 },
  rootCause: {
    fontSize: 9,
    fontWeight: 700,
    color: "#151720",
    backgroundColor: "#fff3d6",
    borderRadius: 3,
    padding: 5,
    marginBottom: 5,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  pill: { fontSize: 7.5, fontWeight: 700, color: "#fff", borderRadius: 3, paddingVertical: 2, paddingHorizontal: 5, textTransform: "uppercase" },
  meta2: { fontSize: 8.5, color: "#6b6d72" },
  actionRow: { flexDirection: "row", gap: 4, marginTop: 3 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#9a9ca3", textAlign: "center" },
});

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function InsightReportDocument({ report }: { report: InsightReport }) {
  const byPriority = (p: "P1" | "P2" | "P3") => report.action_items.filter((a) => a.priority === p);

  return (
    <Document title={`Vocalyze insight report — ${report.headline}`} author="Vocalyze">
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>Vocalyze · AI insight report</Text>
        <Text style={s.headline}>{report.headline}</Text>
        <Text style={s.meta}>
          {fmt(report.period_start)} – {fmt(report.period_end)} · {report.department ?? "All departments"} · {report.feedback_count} feedback
          items analysed
        </Text>
        <Text style={s.summary}>{report.executive_summary}</Text>

        <Text style={s.sectionTitle}>Top concerns</Text>
        {report.top_concerns.length === 0 && <Text style={s.cardBody}>No significant concerns in this period.</Text>}
        {report.top_concerns.map((c, i) => (
          <View key={i} style={s.card} wrap={false}>
            <View style={s.row}>
              <Text style={[s.pill, { backgroundColor: SEVERITY_COLOR[c.severity] ?? "#6b6d72" }]}>{c.severity}</Text>
              <Text style={s.meta2}>
                {c.theme} · {c.mention_count} mentions{c.departments.length ? ` · ${c.departments.join(", ")}` : ""}
              </Text>
            </View>
            <Text style={s.cardTitle}>{c.title}</Text>
            <Text style={s.cardBody}>{c.description}</Text>
          </View>
        ))}

        <Text style={s.sectionTitle}>Recommended actions</Text>
        {(["P1", "P2", "P3"] as const).map((p) => {
          const items = byPriority(p);
          if (items.length === 0) return null;
          return (
            <View key={p} wrap={false}>
              <View style={s.row}>
                <Text style={[s.pill, { backgroundColor: PRIORITY_COLOR[p] }]}>{p}</Text>
              </View>
              {items.map((a, i) => (
                <View key={i} style={s.card} wrap={false}>
                  <Text style={s.cardTitle}>{a.title}</Text>
                  {a.root_cause && <Text style={s.rootCause}>{a.root_cause}</Text>}
                  <Text style={s.cardBody}>{a.description}</Text>
                  <View style={s.actionRow}>
                    <Text style={s.meta2}>Owner: {a.owner}</Text>
                    <Text style={s.meta2}>·</Text>
                    <Text style={s.meta2}>Timeframe: {a.timeframe}</Text>
                  </View>
                  <Text style={[s.meta2, { marginTop: 2 }]}>Impact: {a.expected_impact}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {report.positives.length > 0 && (
          <>
            <Text style={s.sectionTitle}>What&apos;s working</Text>
            {report.positives.map((p, i) => (
              <View key={i} style={s.card} wrap={false}>
                <Text style={s.cardTitle}>{p.title}</Text>
                <Text style={s.cardBody}>{p.description}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={s.footer} fixed>
          Generated by Vocalyze on {fmt(new Date().toISOString())} — anonymous feedback stays anonymous; this briefing never identifies
          individual submitters.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInsightReportPdf(report: InsightReport): Promise<Buffer> {
  return renderToBuffer(<InsightReportDocument report={report} />);
}
